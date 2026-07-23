import { mkdir, readdir, writeFile } from 'node:fs/promises'
import {
  readJson,
  writeJson,
  runWithConcurrency,
} from './data/io-utils.ts'
import { cropOpaqueBounds, findOpaqueBounds } from './data/png-image-helpers.mjs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import {
  DEFAULT_MASTER_API_URL,
  buildGraphicMap,
  resolveGraphicAssetById,
} from './data/champion-asset-helpers.mjs'
import { decodeGraphicBufferWithFallback, readPngDimensions } from './data/mobile-asset-codec.mjs'
import {
  canReuseGeneratedImage,
  fileExists,
  getUpdatedAtFromDefinitions,
  readExistingCollection,
  removeUnexpectedFiles,
  shouldSkipResourceSync,
} from './data/resource-sync-policy.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_CONCURRENCY = 8
const EQUIPMENT_ICONS_DIR_NAME = 'champion-equipment-icons'

function sortByGraphicId(left, right) {
  return Number(left.graphicId) - Number(right.graphicId) || left.graphicId.localeCompare(right.graphicId)
}

function buildChampionEquipmentIconPath(currentVersion, graphicId) {
  return `${currentVersion}/${EQUIPMENT_ICONS_DIR_NAME}/${graphicId}.png`
}

function collectGraphicId(ids, graphicId) {
  const normalizedGraphicId = typeof graphicId === 'string' || typeof graphicId === 'number'
    ? String(graphicId).trim()
    : null

  if (normalizedGraphicId && normalizedGraphicId !== '0') {
    ids.add(normalizedGraphicId)
  }
}

async function collectEquipmentGraphicIds(detailDir) {
  const entries = await readdir(detailDir, { withFileTypes: true })
  const ids = new Set()

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const detail = await readJson(path.join(detailDir, entry.name))

    for (const loot of detail.loot ?? []) {
      collectGraphicId(ids, loot.graphicId)
    }
  }

  return Array.from(ids).sort((left, right) => Number(left) - Number(right) || left.localeCompare(right))
}

async function downloadEquipmentIcon(graphicId, graphicMap, options) {
  const asset = resolveGraphicAssetById(graphicMap, graphicId, options.masterApiUrl ?? DEFAULT_MASTER_API_URL)

  if (!asset) {
    return {
      status: 'missing',
      graphicId,
      message: 'graphic_defines 未找到对应资源',
    }
  }

  const existingItem = options.existingItemsByGraphicId?.get(String(graphicId)) ?? null
  const nextImagePath = buildChampionEquipmentIconPath(options.currentVersion, graphicId)

  if (
    existingItem &&
    canReuseGeneratedImage({
      existingItem,
      nextSourceGraphic: asset.sourceGraphic,
      nextSourceVersion: asset.sourceVersion,
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
      graphicId,
      message: `下载失败：HTTP ${response.status}`,
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
      graphicId,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function syncChampionEquipmentIcons(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法根据 definitions 快照同步装备 icon')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const detailDir = path.resolve(options.detailDir ?? path.join(outputDir, 'champion-details'))
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const updatedAt = getUpdatedAtFromDefinitions(rawDefinitions)
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
      count: existingCollection?.items?.length ?? 0,
      outputDir,
      missingCount: 0,
      skipped: true,
    }
  }

  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)
  const equipmentGraphicIds = await collectEquipmentGraphicIds(detailDir)
  await mkdir(assetDir, { recursive: true })
  const existingItemsByGraphicId = new Map(
    (existingCollection?.items ?? []).map((item) => [String(item.graphicId), item]),
  )

  const results = await runWithConcurrency(
    equipmentGraphicIds,
    concurrency,
    (graphicId) =>
      downloadEquipmentIcon(graphicId, graphicMap, {
        outputDir,
        currentVersion,
        masterApiUrl: options.masterApiUrl,
        existingItemsByGraphicId,
      }),
  )

  const items = results
    .filter((result) => result.status === 'ready')
    .map((result) => result.item)
    .sort(sortByGraphicId)
  const missing = results.filter((result) => result.status === 'missing')
  await removeUnexpectedFiles(assetDir, new Set(items.map((item) => path.basename(item.image.path))))

  await writeJson(collectionFile, {
    items,
    missing,
    updatedAt,
  })

  return {
    count: items.length,
    outputDir,
    missingCount: missing.length,
  }
}

async function main() {
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

  if (values.help) {
    console.log(`用法：
  node scripts/sync-idle-champions-equipment-icons.mjs --input <definitions.json> [--outputDir <dir>]

说明：
  根据 public/data/v1/champion-details/*.json 中出现的 loot graphicId，
  从官方 mobile_assets 下载并生成本地装备 icon，输出到：
  - public/data/v1/champion-equipment-icons/*.png
  - public/data/v1/champion-equipment-icons.json`)
    return
  }

  const result = await syncChampionEquipmentIcons(values)
  console.log(`装备 icon 同步完成：${result.count} 项 -> ${result.outputDir}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`同步装备 icon 失败：${error.message}`)
    process.exitCode = 1
  })
}
