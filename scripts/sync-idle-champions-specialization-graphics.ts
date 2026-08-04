import { Buffer } from 'node:buffer'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { cropOpaqueBounds } from './data/png-image-helpers.ts'
import {
  readJson,
  writeJson,
  runWithConcurrency,
} from './data/io-utils.ts'
import {
  DEFAULT_MASTER_API_URL,
  buildGraphicMap,
  resolveGraphicAssetById,
} from './data/champion-asset-helpers.ts'
import { decodeGraphicBufferWithFallback, readPngDimensions } from './data/mobile-asset-codec.ts'
import {
  canReuseGeneratedImage,
  fileExists,
  getUpdatedAtFromDefinitions,
  readExistingCollection,
  removeUnexpectedFiles,
  shouldSkipResourceSync,
} from './data/resource-sync-policy.ts'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_CONCURRENCY = 8
const SPECIALIZATION_GRAPHICS_DIR_NAME = 'champion-specialization-graphics'

interface SpecializationGraphicImage {
  path: string
  width: number
  height: number
  bytes: number
  format: 'png'
}

interface SpecializationGraphicItem {
  graphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  remotePath: string
  remoteUrl: string
  delivery: string
  uses: string[]
  image: SpecializationGraphicImage
}

interface DownloadReadyResult {
  status: 'ready'
  item: SpecializationGraphicItem
}

interface DownloadMissingResult {
  status: 'missing'
  graphicId: string
  message: string
}

type DownloadResult = DownloadReadyResult | DownloadMissingResult

interface DownloadOptions {
  outputDir: string
  currentVersion: string
  masterApiUrl: string | undefined
  existingItemsByGraphicId: Map<string, SpecializationGraphicItem>
}

interface SyncSpecializationGraphicsOptions {
  input?: string | undefined
  outputDir?: string | undefined
  currentVersion?: string | undefined
  detailDir?: string | undefined
  masterApiUrl?: string | undefined
  concurrency?: string | undefined
}

interface SpecializationSyncResult {
  outputDir: string
  count: number
  missingCount: number
  skipped?: boolean
}

function sortByGraphicId(left: SpecializationGraphicItem, right: SpecializationGraphicItem): number {
  const numericDiff = Number(left.graphicId) - Number(right.graphicId)

  if (numericDiff !== 0) {
    return numericDiff
  }

  return left.graphicId.localeCompare(right.graphicId)
}

function buildSpecializationGraphicPath(currentVersion: string, graphicId: string): string {
  return `${currentVersion}/${SPECIALIZATION_GRAPHICS_DIR_NAME}/${graphicId}.png`
}

function collectGraphicId(ids: Set<string>, graphicId: unknown): void {
  const normalizedGraphicId = typeof graphicId === 'string' || typeof graphicId === 'number'
    ? String(graphicId).trim()
    : null

  if (normalizedGraphicId != null && normalizedGraphicId !== '' && normalizedGraphicId !== '0') {
    ids.add(normalizedGraphicId)
  }
}

async function collectSpecializationGraphicIds(detailDir: string): Promise<string[]> {
  const entries = await readdir(detailDir, { withFileTypes: true })
  const ids = new Set<string>()

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const detail = await readJson(path.join(detailDir, entry.name))
    const detailRecord = detail as Record<string, unknown> | null

    const upgradesRaw = detailRecord?.upgrades
    if (Array.isArray(upgradesRaw)) {
      for (const upgrade of upgradesRaw) {
        collectGraphicId(ids, (upgrade as Record<string, unknown> | null)?.specializationGraphicId)
      }
    }

    const attacks = detailRecord?.attacks as Record<string, unknown> | null | undefined
    const ultimate = attacks?.ultimate as Record<string, unknown> | null | undefined
    collectGraphicId(ids, ultimate?.graphicId)
  }

  return Array.from(ids).sort((left, right) => {
    const numericDiff = Number(left) - Number(right)

    if (numericDiff !== 0) {
      return numericDiff
    }

    return left.localeCompare(right)
  })
}

async function downloadSpecializationGraphic(
  graphicId: string,
  graphicMap: Map<string, Record<string, unknown>>,
  options: DownloadOptions,
): Promise<DownloadResult> {
  const asset = resolveGraphicAssetById(graphicMap, graphicId, options.masterApiUrl ?? DEFAULT_MASTER_API_URL)

  if (!asset) {
    return {
      status: 'missing',
      message: 'graphic_defines 未找到对应资源',
      graphicId,
    }
  }

  const existingItem = options.existingItemsByGraphicId.get(graphicId) ?? null
  const nextImagePath = buildSpecializationGraphicPath(options.currentVersion, graphicId)

  if (
    existingItem
    && canReuseGeneratedImage({
      existingItem,
      nextImagePath,
      nextSourceGraphic: asset.sourceGraphic,
      nextSourceVersion: asset.sourceVersion,
    })
  ) {
    const outputFile = path.join(options.outputDir, SPECIALIZATION_GRAPHICS_DIR_NAME, `${graphicId}.png`)

    if (await fileExists(outputFile)) {
      return {
        status: 'ready',
        item: existingItem,
      }
    }
  }

  const response = await fetch(asset.remoteUrl, { cache: 'no-store' })

  if (!response.ok) {
    return {
      status: 'missing',
      message: `下载失败：HTTP ${String(response.status)}`,
      graphicId,
    }
  }

  try {
    const rawBuffer = Buffer.from(await response.arrayBuffer())
    const decoded = decodeGraphicBufferWithFallback(asset, rawBuffer)
    const cropped = cropOpaqueBounds(decoded.buffer)
    const dimensions = readPngDimensions(cropped.pngBuffer)
    const outputFile = path.join(options.outputDir, SPECIALIZATION_GRAPHICS_DIR_NAME, `${graphicId}.png`)

    await writeFile(outputFile, cropped.pngBuffer)

    return {
      status: 'ready',
      item: {
        graphicId,
        sourceGraphic: asset.sourceGraphic,
        sourceVersion: asset.sourceVersion,
        remotePath: asset.remotePath,
        remoteUrl: asset.remoteUrl,
        delivery: decoded.delivery,
        uses: asset.uses,
        image: {
          path: buildSpecializationGraphicPath(options.currentVersion, graphicId),
          width: dimensions.width,
          height: dimensions.height,
          bytes: cropped.pngBuffer.length,
          format: 'png',
        },
      },
    }
  } catch (error) {
    return {
      status: 'missing',
      message: error instanceof Error ? error.message : String(error),
      graphicId,
    }
  }
}

export async function syncChampionSpecializationGraphics(
  options: SyncSpecializationGraphicsOptions = {},
): Promise<SpecializationSyncResult> {
  if (options.input == null || options.input === '') {
    throw new Error('缺少 --input，无法根据 definitions 快照同步专精图')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const detailDir = path.resolve(options.detailDir ?? path.join(outputDir, 'champion-details'))
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const rawDefinitionsRecord = rawDefinitions as Record<string, unknown> | null
  const updatedAt = getUpdatedAtFromDefinitions(rawDefinitionsRecord)
  const collectionFile = path.join(outputDir, `${SPECIALIZATION_GRAPHICS_DIR_NAME}.json`)
  const existingCollection = await readExistingCollection(collectionFile)
  const assetDir = path.join(outputDir, SPECIALIZATION_GRAPHICS_DIR_NAME)

  if (
    shouldSkipResourceSync({
      existingUpdatedAt: existingCollection?.updatedAt,
      nextUpdatedAt: updatedAt,
    })
  ) {
    return {
      outputDir: assetDir,
      count: existingCollection?.items.length ?? 0,
      missingCount: 0,
      skipped: true,
    }
  }

  const graphicDefinesRaw = rawDefinitionsRecord?.graphic_defines
  const graphicMap = buildGraphicMap(Array.isArray(graphicDefinesRaw) ? graphicDefinesRaw : [])
  const specializationGraphicIds = await collectSpecializationGraphicIds(detailDir)
  await mkdir(assetDir, { recursive: true })
  const existingItemsByGraphicId = new Map<string, SpecializationGraphicItem>(
    (existingCollection?.items ?? []).map(
      (item): [string, SpecializationGraphicItem] => [
        (item as SpecializationGraphicItem).graphicId,
        item as SpecializationGraphicItem,
      ],
    ),
  )

  const results = await runWithConcurrency(
    specializationGraphicIds,
    concurrency,
    (graphicId) =>
      downloadSpecializationGraphic(graphicId, graphicMap, {
        outputDir,
        currentVersion,
        existingItemsByGraphicId,
        masterApiUrl: options.masterApiUrl,
      }),
  )

  const items = results
    .filter((result): result is DownloadReadyResult => result.status === 'ready')
    .map((result) => result.item)
    .sort(sortByGraphicId)
  const missing = results.filter(
    (result): result is DownloadMissingResult => result.status === 'missing',
  )
  await removeUnexpectedFiles(
    assetDir,
    new Set(items.map((item) => path.basename(item.image.path))),
  )

  await writeJson(collectionFile, {
    items,
    missing,
    updatedAt,
  })

  console.log(
    `专精图同步完成：ready=${String(items.length)}, missing=${String(missing.length)}, dir=${assetDir}`,
  )

  if (missing.length > 0) {
    console.log(
      `- 未同步样例：${missing
        .slice(0, 12)
        .map((item) => `${item.graphicId}:${item.message}`)
        .join(' | ')}`,
    )
  }

  return {
    outputDir: assetDir,
    count: items.length,
    missingCount: missing.length,
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
      detailDir: { type: 'string' },
      concurrency: { type: 'string' },
      masterApiUrl: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help === true) {
    console.log(`用法：
  node scripts/sync-idle-champions-specialization-graphics.ts --input <definitions.json>

说明：
  从 champion-details 收集 specializationGraphicId，下载并写出详情页本地专精图资源。

常用参数：
  --input <file>         官方 definitions 快照
  --outputDir <dir>      输出目录，默认 ${DEFAULT_OUTPUT_DIR}
  --currentVersion <v>   当前版本号，默认 ${DEFAULT_CURRENT_VERSION}
  --detailDir <dir>      champion-details 目录，默认 <outputDir>/champion-details
  --concurrency <n>      并发数，默认 ${String(DEFAULT_CONCURRENCY)}
`)
    return
  }

  await syncChampionSpecializationGraphics(values)
}

const entryPoint = process.argv[1]

if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch((error: unknown) => {
    console.error(`同步专精图失败：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
