import { mkdir, writeFile } from 'node:fs/promises'
import {
  readJson,
  writeJson,
  runWithConcurrency,
} from './data/io-utils.mjs'
import { findOpaqueBounds } from './data/png-image-helpers.mjs'
import { findPngSignatureOffset, getPngDimensions, trimPngToIend } from './data/mobile-asset-codec.mjs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import {
  CHAMPION_PORTRAIT_DIR_NAME,
  DEFAULT_MASTER_API_URL,
  buildChampionPortraitPath,
  collectChampionPortraitSources,
  encodeGraphicPath,
  ensureTrailingSlash,
} from './data/champion-asset-helpers.mjs'
import {
  canReuseGeneratedImage,
  fileExists,
  getUpdatedAtFromDefinitions,
  readExistingCollection,
  removeUnexpectedFiles,
  shouldSkipResourceSync,
} from './data/resource-sync-policy.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CONCURRENCY = 8
const PORTRAIT_MANIFEST_FILE_NAME = 'champion-portraits.manifest.json'

function trimTransparentAreaAndCenter(pngBuffer) {
  const normalizedPngBuffer = trimPngToIend(pngBuffer)
  const source = PNG.sync.read(normalizedPngBuffer)
  const bounds = findOpaqueBounds(source)

  if (!bounds) {
    return {
      pngBuffer: normalizedPngBuffer,
      width: source.width,
      height: source.height,
      contentWidth: source.width,
      contentHeight: source.height,
      trimmed: false,
    }
  }

  const outputSize = Math.max(bounds.width, bounds.height)
  const output = new PNG({ width: outputSize, height: outputSize })
  const offsetX = Math.floor((outputSize - bounds.width) / 2)
  const offsetY = Math.floor((outputSize - bounds.height) / 2)

  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceIndex =
        ((bounds.top + y) * source.width + (bounds.left + x)) * 4
      const outputIndex = ((offsetY + y) * output.width + (offsetX + x)) * 4

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
    contentWidth: bounds.width,
    contentHeight: bounds.height,
    trimmed: bounds.width !== source.width || bounds.height !== source.height || bounds.left > 0 || bounds.top > 0,
  }
}

async function downloadChampionPortrait(task, options) {
  const existingItem = options.existingItemsByChampionId?.get(String(task.championId)) ?? null
  const nextImagePath = buildChampionPortraitPath(options.currentVersion, task.championId)

  if (
    existingItem &&
    canReuseGeneratedImage({
      existingItem,
      nextSourceGraphic: task.graphic,
      nextSourceVersion: task.version,
      nextImagePath,
    })
  ) {
    const outputFile = path.join(options.outputDir, CHAMPION_PORTRAIT_DIR_NAME, `${task.championId}.png`)

    if (await fileExists(outputFile)) {
      return existingItem
    }
  }

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

  const extractedPngBuffer = rawBuffer.subarray(pngOffset)
  const processedPng = trimTransparentAreaAndCenter(extractedPngBuffer)
  const outputFile = path.join(options.outputDir, CHAMPION_PORTRAIT_DIR_NAME, `${task.championId}.png`)
  const sourceDimensions = getPngDimensions(rawBuffer, pngOffset)

  await writeFile(outputFile, processedPng.pngBuffer)

  return {
    championId: task.championId,
    sourceGraphic: task.graphic,
    sourceVersion: task.version,
    width: processedPng.width,
    height: processedPng.height,
    contentWidth: processedPng.contentWidth,
    contentHeight: processedPng.contentHeight,
    sourceWidth: sourceDimensions?.width ?? null,
    sourceHeight: sourceDimensions?.height ?? null,
    trimmed: processedPng.trimmed,
    wrappedBytes: pngOffset,
    bytes: processedPng.pngBuffer.length,
    sourceUrl: url,
    image: {
      path: nextImagePath,
      width: processedPng.width,
      height: processedPng.height,
      bytes: processedPng.pngBuffer.length,
      format: 'png',
    },
  }
}

export async function syncChampionPortraits(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法根据 definitions 快照同步英雄头像')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const updatedAt = getUpdatedAtFromDefinitions(rawDefinitions)
  const manifestFile = path.join(outputDir, PORTRAIT_MANIFEST_FILE_NAME)
  const existingManifest = await readExistingCollection(manifestFile)

  if (
    shouldSkipResourceSync({
      existingUpdatedAt: existingManifest?.updatedAt,
      nextUpdatedAt: updatedAt,
    })
  ) {
    return {
      outputDir: path.join(outputDir, CHAMPION_PORTRAIT_DIR_NAME),
      count: existingManifest?.items?.length ?? 0,
      portraits: existingManifest?.items ?? [],
      trimmedCount: 0,
      sourceDimensions: [],
      contentDimensions: [],
      dimensions: [],
      wrappedBytes: [],
      skipped: true,
    }
  }

  const tasks = collectChampionPortraitSources(rawDefinitions)
  const existingItemsByChampionId = new Map(
    (existingManifest?.items ?? []).map((item) => [String(item.championId), item]),
  )

  await mkdir(path.join(outputDir, CHAMPION_PORTRAIT_DIR_NAME), { recursive: true })

  const portraits = await runWithConcurrency(tasks, concurrency, (task) =>
    downloadChampionPortrait(task, {
      outputDir,
      currentVersion: options.currentVersion ?? 'v1',
      masterApiUrl: options.masterApiUrl,
      existingItemsByChampionId,
    }),
  )

  await removeUnexpectedFiles(
    path.join(outputDir, CHAMPION_PORTRAIT_DIR_NAME),
    new Set(portraits.map((portrait) => path.basename(portrait.image.path))),
  )

  await writeJson(manifestFile, {
    items: portraits,
    updatedAt,
  })

  const dimensionSummary = new Map()
  const sourceDimensionSummary = new Map()
  const contentDimensionSummary = new Map()
  const wrappedBytesSummary = new Map()
  let trimmedCount = 0

  portraits.forEach((portrait) => {
    const dimensionKey =
      portrait.width && portrait.height ? `${portrait.width}x${portrait.height}` : 'unknown'
    dimensionSummary.set(dimensionKey, (dimensionSummary.get(dimensionKey) ?? 0) + 1)
    const sourceDimensionKey =
      portrait.sourceWidth && portrait.sourceHeight
        ? `${portrait.sourceWidth}x${portrait.sourceHeight}`
        : 'unknown'
    sourceDimensionSummary.set(
      sourceDimensionKey,
      (sourceDimensionSummary.get(sourceDimensionKey) ?? 0) + 1,
    )
    const contentDimensionKey =
      portrait.contentWidth && portrait.contentHeight
        ? `${portrait.contentWidth}x${portrait.contentHeight}`
        : 'unknown'
    contentDimensionSummary.set(
      contentDimensionKey,
      (contentDimensionSummary.get(contentDimensionKey) ?? 0) + 1,
    )
    wrappedBytesSummary.set(
      String(portrait.wrappedBytes),
      (wrappedBytesSummary.get(String(portrait.wrappedBytes)) ?? 0) + 1,
    )
    if (portrait.trimmed) {
      trimmedCount += 1
    }
  })

  return {
    outputDir: path.join(outputDir, CHAMPION_PORTRAIT_DIR_NAME),
    count: portraits.length,
    portraits,
    trimmedCount,
    sourceDimensions: Array.from(sourceDimensionSummary.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([size, count]) => ({ size, count })),
    contentDimensions: Array.from(contentDimensionSummary.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([size, count]) => ({ size, count })),
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
  console.log(`- 已裁切透明边数量: ${result.trimmedCount}`)
  console.log(
    `- 原始尺寸分布: ${result.sourceDimensions.map((item) => `${item.size} (${item.count})`).join(', ') || '无'}`,
  )
  console.log(
    `- 有效内容尺寸: ${result.contentDimensions.map((item) => `${item.size} (${item.count})`).join(', ') || '无'}`,
  )
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
