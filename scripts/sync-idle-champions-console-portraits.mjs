import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import {
  CHAMPION_CONSOLE_PORTRAIT_DIR_NAME,
  DEFAULT_MASTER_API_URL,
  collectChampionConsolePortraitSources,
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

function trimPngToIend(buffer) {
  let cursor = 8

  while (cursor + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(cursor)
    const chunkType = buffer.subarray(cursor + 4, cursor + 8).toString('ascii')
    const nextCursor = cursor + 12 + chunkLength

    if (nextCursor > buffer.length) {
      return buffer
    }

    cursor = nextCursor

    if (chunkType === 'IEND') {
      return buffer.subarray(0, cursor)
    }
  }

  return buffer
}

function findOpaqueBounds(png) {
  let left = png.width
  let top = png.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(png.width * y + x) * 4 + 3]

      if (alpha === 0) {
        continue
      }

      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) {
    return null
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

function trimTransparentArea(pngBuffer) {
  const normalizedPngBuffer = trimPngToIend(pngBuffer)
  const source = PNG.sync.read(normalizedPngBuffer)
  const bounds = findOpaqueBounds(source)

  if (!bounds) {
    return {
      pngBuffer: normalizedPngBuffer,
      width: source.width,
      height: source.height,
      trimmed: false,
    }
  }

  const output = new PNG({ width: bounds.width, height: bounds.height })

  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceIndex =
        ((bounds.top + y) * source.width + (bounds.left + x)) * 4
      const outputIndex = (y * output.width + x) * 4

      output.data[outputIndex] = source.data[sourceIndex]
      output.data[outputIndex + 1] = source.data[sourceIndex + 1]
      output.data[outputIndex + 2] = source.data[sourceIndex + 2]
      output.data[outputIndex + 3] = source.data[sourceIndex + 3]
    }
  }

  return {
    pngBuffer: PNG.sync.write(output),
    width: output.width,
    height: output.height,
    trimmed: bounds.width !== source.width || bounds.height !== source.height || bounds.left > 0 || bounds.top > 0,
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
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

async function downloadChampionConsolePortrait(task, options) {
  const baseUrl = ensureTrailingSlash(options.masterApiUrl ?? DEFAULT_MASTER_API_URL)
  const url = `${baseUrl}mobile_assets/${encodeGraphicPath(task.graphic)}`
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`下载 ${task.graphic} 失败：HTTP ${response.status}`)
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer())
  const pngOffset = findPngSignatureOffset(rawBuffer)

  if (pngOffset < 0) {
    throw new Error(`资源 ${task.graphic} 未找到 PNG 数据头，无法写出正面图`)
  }

  const processedPng = trimTransparentArea(rawBuffer.subarray(pngOffset))
  const outputFile = path.join(
    options.outputDir,
    CHAMPION_CONSOLE_PORTRAIT_DIR_NAME,
    `${task.championId}.png`,
  )
  const dimensions = getPngDimensions(rawBuffer, pngOffset)

  await writeFile(outputFile, processedPng.pngBuffer)

  return {
    championId: task.championId,
    consolePortraitGraphicId: task.consolePortraitGraphicId,
    graphic: task.graphic,
    version: task.version,
    outputFile,
    width: processedPng.width,
    height: processedPng.height,
    sourceWidth: dimensions?.width ?? null,
    sourceHeight: dimensions?.height ?? null,
    trimmed: processedPng.trimmed,
    wrappedBytes: pngOffset,
    bytes: processedPng.pngBuffer.length,
    sourceUrl: url,
  }
}

export async function syncChampionConsolePortraits(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法根据 definitions 快照同步英雄正面图')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const tasks = collectChampionConsolePortraitSources(rawDefinitions, options.masterApiUrl)

  await mkdir(path.join(outputDir, CHAMPION_CONSOLE_PORTRAIT_DIR_NAME), { recursive: true })

  const portraits = await runWithConcurrency(tasks, concurrency, (task) =>
    downloadChampionConsolePortrait(task, {
      outputDir,
      masterApiUrl: options.masterApiUrl,
    }),
  )

  const dimensionSummary = new Map()

  portraits.forEach((portrait) => {
    const dimensionKey =
      portrait.width && portrait.height ? `${portrait.width}x${portrait.height}` : 'unknown'
    dimensionSummary.set(dimensionKey, (dimensionSummary.get(dimensionKey) ?? 0) + 1)
  })

  return {
    outputDir: path.join(outputDir, CHAMPION_CONSOLE_PORTRAIT_DIR_NAME),
    count: portraits.length,
    portraits,
    dimensions: Array.from(dimensionSummary.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([size, count]) => ({ size, count })),
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/sync-idle-champions-console-portraits.mjs --input <raw-json>

可选参数：
  --input <file>             官方 definitions 快照 JSON
  --outputDir <dir>          正面图输出根目录，默认 ${DEFAULT_OUTPUT_DIR}
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

  const result = await syncChampionConsolePortraits(values)

  console.log('英雄正面图同步完成：')
  console.log(`- 输出目录: ${result.outputDir}`)
  console.log(`- 数量: ${result.count}`)
  console.log(
    `- 尺寸分布: ${result.dimensions.map((item) => `${item.size} (${item.count})`).join(', ') || '无'}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`同步英雄正面图失败：${error.message}`)
    process.exitCode = 1
  })
}
