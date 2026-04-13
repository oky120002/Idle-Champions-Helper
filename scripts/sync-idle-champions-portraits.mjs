import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import {
  CHAMPION_PORTRAIT_DIR_NAME,
  DEFAULT_MASTER_API_URL,
  collectChampionPortraitSources,
  encodeGraphicPath,
  ensureTrailingSlash,
} from './data/champion-portrait-helpers.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CONCURRENCY = 8

function findPngSignatureOffset(buffer) {
  for (let index = 0; index <= buffer.length - 8; index += 1) {
    if (
      buffer[index] === 0x89 &&
      buffer[index + 1] === 0x50 &&
      buffer[index + 2] === 0x4e &&
      buffer[index + 3] === 0x47 &&
      buffer[index + 4] === 0x0d &&
      buffer[index + 5] === 0x0a &&
      buffer[index + 6] === 0x1a &&
      buffer[index + 7] === 0x0a
    ) {
      return index
    }
  }

  return -1
}

function getPngDimensions(buffer, offset) {
  if (offset < 0 || offset + 24 > buffer.length) {
    return null
  }

  return {
    width: buffer.readUInt32BE(offset + 16),
    height: buffer.readUInt32BE(offset + 20),
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function downloadChampionPortrait(task, options) {
  const baseUrl = ensureTrailingSlash(options.masterApiUrl ?? DEFAULT_MASTER_API_URL)
  const url = `${baseUrl}mobile_assets/${encodeGraphicPath(task.graphic)}`
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`下载 ${task.graphic} 失败：HTTP ${response.status}`)
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer())
  const pngOffset = findPngSignatureOffset(rawBuffer)

  if (pngOffset < 0) {
    throw new Error(`资源 ${task.graphic} 未找到 PNG 数据头，无法写出头像文件`)
  }

  const pngBuffer = rawBuffer.subarray(pngOffset)
  const outputFile = path.join(options.outputDir, CHAMPION_PORTRAIT_DIR_NAME, `${task.championId}.png`)
  const dimensions = getPngDimensions(rawBuffer, pngOffset)

  await writeFile(outputFile, pngBuffer)

  return {
    championId: task.championId,
    graphic: task.graphic,
    version: task.version,
    outputFile,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    wrappedBytes: pngOffset,
    bytes: pngBuffer.length,
    sourceUrl: url,
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0

  async function consume() {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => consume()),
  )

  return results
}

export async function syncChampionPortraits(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法根据 definitions 快照同步英雄头像')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const tasks = collectChampionPortraitSources(rawDefinitions)

  await mkdir(path.join(outputDir, CHAMPION_PORTRAIT_DIR_NAME), { recursive: true })

  const portraits = await runWithConcurrency(tasks, concurrency, (task) =>
    downloadChampionPortrait(task, {
      outputDir,
      masterApiUrl: options.masterApiUrl,
    }),
  )

  const dimensionSummary = new Map()
  const wrappedBytesSummary = new Map()

  portraits.forEach((portrait) => {
    const dimensionKey =
      portrait.width && portrait.height ? `${portrait.width}x${portrait.height}` : 'unknown'
    dimensionSummary.set(dimensionKey, (dimensionSummary.get(dimensionKey) ?? 0) + 1)
    wrappedBytesSummary.set(
      String(portrait.wrappedBytes),
      (wrappedBytesSummary.get(String(portrait.wrappedBytes)) ?? 0) + 1,
    )
  })

  return {
    outputDir: path.join(outputDir, CHAMPION_PORTRAIT_DIR_NAME),
    count: portraits.length,
    portraits,
    dimensions: Array.from(dimensionSummary.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([size, count]) => ({ size, count })),
    wrappedBytes: Array.from(wrappedBytesSummary.entries())
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([bytes, count]) => ({ bytes: Number(bytes), count })),
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/sync-idle-champions-portraits.mjs --input <raw-json>

可选参数：
  --input <file>             官方 definitions 快照 JSON
  --outputDir <dir>          头像输出根目录，默认 ${DEFAULT_OUTPUT_DIR}
  --masterApiUrl <url>       官方 mobile_assets 根地址，默认 ${DEFAULT_MASTER_API_URL}
  --concurrency <n>          并发下载数，默认 ${DEFAULT_CONCURRENCY}
  --help                     显示帮助
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      outputDir: { type: 'string' },
      masterApiUrl: { type: 'string' },
      concurrency: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    printUsage()
    return
  }

  const result = await syncChampionPortraits(values)

  console.log('英雄头像同步完成：')
  console.log(`- 输出目录: ${result.outputDir}`)
  console.log(`- 数量: ${result.count}`)
  console.log(
    `- 尺寸分布: ${result.dimensions.map((item) => `${item.size} (${item.count})`).join(', ') || '无'}`,
  )
  console.log(
    `- 外层包装字节: ${result.wrappedBytes.map((item) => `${item.bytes} (${item.count})`).join(', ') || '无'}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`同步英雄头像失败：${error.message}`)
    process.exitCode = 1
  })
}
