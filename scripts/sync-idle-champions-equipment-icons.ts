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
const EQUIPMENT_ICONS_DIR_NAME = 'champion-equipment-icons'

interface EquipmentGraphicImage {
  path: string
  width: number
  height: number
  bytes: number
  format: 'png'
}

interface EquipmentGraphicItem {
  graphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  remotePath: string
  remoteUrl: string
  delivery: string
  uses: string[]
  image: EquipmentGraphicImage
}

interface DownloadReadyResult {
  status: 'ready'
  item: EquipmentGraphicItem
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
  existingItemsByGraphicId: Map<string, EquipmentGraphicItem>
}

interface SyncEquipmentIconsOptions {
  input?: string | undefined
  outputDir?: string | undefined
  currentVersion?: string | undefined
  detailDir?: string | undefined
  masterApiUrl?: string | undefined
  concurrency?: string | undefined
}

interface EquipmentSyncResult {
  count: number
  outputDir: string
  missingCount: number
  skipped?: boolean
}

function sortByGraphicId(left: EquipmentGraphicItem, right: EquipmentGraphicItem): number {
  const numericDiff = Number(left.graphicId) - Number(right.graphicId)
  if (numericDiff === 0 || Number.isNaN(numericDiff)) {
    return left.graphicId.localeCompare(right.graphicId)
  }
  return numericDiff
}

function buildChampionEquipmentIconPath(currentVersion: string, graphicId: string): string {
  return `${currentVersion}/${EQUIPMENT_ICONS_DIR_NAME}/${graphicId}.png`
}

function collectGraphicId(ids: Set<string>, graphicId: unknown): void {
  const normalizedGraphicId = typeof graphicId === 'string' || typeof graphicId === 'number'
    ? String(graphicId).trim()
    : null

  if (normalizedGraphicId != null && normalizedGraphicId !== '' && normalizedGraphicId !== '0') {
    ids.add(normalizedGraphicId)
  }
}

async function collectEquipmentGraphicIds(detailDir: string): Promise<string[]> {
  const entries = await readdir(detailDir, { withFileTypes: true })
  const ids = new Set<string>()

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const detail = await readJson(path.join(detailDir, entry.name))
    const detailRecord = detail as Record<string, unknown> | null
    const lootRaw = detailRecord?.loot
    const loot = Array.isArray(lootRaw) ? lootRaw : []

    for (const lootItem of loot) {
      collectGraphicId(ids, (lootItem as Record<string, unknown> | null)?.graphicId)
    }
  }

  return Array.from(ids).sort((left, right) => {
    const numericDiff = Number(left) - Number(right)
    if (numericDiff === 0 || Number.isNaN(numericDiff)) {
      return left.localeCompare(right)
    }
    return numericDiff
  })
}

async function downloadEquipmentIcon(
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
  const nextImagePath = buildChampionEquipmentIconPath(options.currentVersion, graphicId)

  if (
    existingItem
    && canReuseGeneratedImage({
      nextSourceGraphic: asset.sourceGraphic,
      nextSourceVersion: asset.sourceVersion,
      existingItem,
      nextImagePath,
    })
  ) {
    const outputFile = path.join(options.outputDir, EQUIPMENT_ICONS_DIR_NAME, `${graphicId}.png`)

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
    const outputFile = path.join(options.outputDir, EQUIPMENT_ICONS_DIR_NAME, `${graphicId}.png`)

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
          path: buildChampionEquipmentIconPath(options.currentVersion, graphicId),
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

export async function syncChampionEquipmentIcons(
  options: SyncEquipmentIconsOptions = {},
): Promise<EquipmentSyncResult> {
  if (options.input == null || options.input === '') {
    throw new Error('缺少 --input，无法根据 definitions 快照同步装备 icon')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const detailDir = path.resolve(options.detailDir ?? path.join(outputDir, 'champion-details'))
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const rawDefinitionsRecord = rawDefinitions as Record<string, unknown> | null
  const updatedAt = getUpdatedAtFromDefinitions(rawDefinitionsRecord)
  const collectionFile = path.join(outputDir, `${EQUIPMENT_ICONS_DIR_NAME}.json`)
  const existingCollection = await readExistingCollection(collectionFile)
  const assetDir = path.join(outputDir, EQUIPMENT_ICONS_DIR_NAME)

  if (
    shouldSkipResourceSync({
      existingUpdatedAt: existingCollection?.updatedAt,
      nextUpdatedAt: updatedAt,
    })
  ) {
    return {
      count: existingCollection?.items.length ?? 0,
      missingCount: 0,
      skipped: true,
      outputDir,
    }
  }

  const graphicDefinesRaw = rawDefinitionsRecord?.graphic_defines
  const graphicMap = buildGraphicMap(Array.isArray(graphicDefinesRaw) ? graphicDefinesRaw : [])
  const equipmentGraphicIds = await collectEquipmentGraphicIds(detailDir)
  await mkdir(assetDir, { recursive: true })
  const existingItemsByGraphicId = new Map<string, EquipmentGraphicItem>(
    (existingCollection?.items ?? []).map(
      (item): [string, EquipmentGraphicItem] => [
        (item as EquipmentGraphicItem).graphicId,
        item as EquipmentGraphicItem,
      ],
    ),
  )

  const results = await runWithConcurrency(
    equipmentGraphicIds,
    concurrency,
    (graphicId) =>
      downloadEquipmentIcon(graphicId, graphicMap, {
        masterApiUrl: options.masterApiUrl,
        outputDir,
        currentVersion,
        existingItemsByGraphicId,
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

  return {
    count: items.length,
    missingCount: missing.length,
    outputDir,
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
      detailDir: { type: 'string' },
      masterApiUrl: { type: 'string' },
      concurrency: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help === true) {
    console.log(`用法：
  node scripts/sync-idle-champions-equipment-icons.ts --input <definitions.json> [--outputDir <dir>]

说明：
  根据 public/data/v1/champion-details/*.json 中出现的 loot graphicId，
  从官方 mobile_assets 下载并生成本地装备 icon，输出到：
  - public/data/v1/champion-equipment-icons/*.png
  - public/data/v1/champion-equipment-icons.json`)
    return
  }

  const result = await syncChampionEquipmentIcons(values)
  console.log(`装备 icon 同步完成：${String(result.count)} 项 -> ${result.outputDir}`)
}

const argvEntry = process.argv[1]
if (argvEntry != null && import.meta.url === pathToFileURL(argvEntry).href) {
  main().catch((error: unknown) => {
    console.error(`同步装备 icon 失败：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
