import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import {
  DEFAULT_MASTER_API_URL,
  buildGraphicMap,
  resolveGraphicAssetById,
} from './data/champion-portrait-helpers.mjs'
import { decodeRemoteGraphicBuffer, readPngDimensions } from './data/mobile-asset-codec.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_CONCURRENCY = 8
const SPECIALIZATION_GRAPHICS_DIR_NAME = 'champion-specialization-graphics'

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
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

function buildSpecializationGraphicPath(currentVersion, graphicId) {
  return `${currentVersion}/${SPECIALIZATION_GRAPHICS_DIR_NAME}/${graphicId}.png`
}

function sortByGraphicId(left, right) {
  return Number(left.graphicId) - Number(right.graphicId) || left.graphicId.localeCompare(right.graphicId)
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

export function cropOpaqueBounds(pngBuffer) {
  const source = PNG.sync.read(pngBuffer)
  const bounds = findOpaqueBounds(source)

  if (!bounds) {
    return {
      pngBuffer,
      width: source.width,
      height: source.height,
      cropped: false,
    }
  }

  const output = new PNG({ width: bounds.width, height: bounds.height })

  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceIndex = ((bounds.top + y) * source.width + (bounds.left + x)) * 4
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
    cropped:
      bounds.width !== source.width ||
      bounds.height !== source.height ||
      bounds.left > 0 ||
      bounds.top > 0,
  }
}

function decodeSpecializationGraphicBuffer(asset, rawBuffer) {
  const deliveryCandidates = Array.from(
    new Set([
      asset.delivery,
      'wrapped-png',
      'zlib-png',
    ]),
  )

  for (const delivery of deliveryCandidates) {
    try {
      return {
        delivery,
        buffer: decodeRemoteGraphicBuffer({ ...asset, delivery }, rawBuffer),
      }
    } catch {
      // Try the next known transport. Some UI graphics are not tagged consistently in uses.
    }
  }

  throw new Error(`无法解析 graphic ${asset.graphicId}`)
}

async function collectSpecializationGraphicIds(detailDir) {
  const entries = await readdir(detailDir, { withFileTypes: true })
  const ids = new Set()

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const detail = await readJson(path.join(detailDir, entry.name))

    for (const upgrade of detail.upgrades ?? []) {
      const graphicId = typeof upgrade.specializationGraphicId === 'string'
        ? upgrade.specializationGraphicId.trim()
        : null

      if (graphicId && graphicId !== '0') {
        ids.add(graphicId)
      }
    }
  }

  return Array.from(ids).sort((left, right) => Number(left) - Number(right) || left.localeCompare(right))
}

async function downloadSpecializationGraphic(graphicId, graphicMap, options) {
  const asset = resolveGraphicAssetById(graphicMap, graphicId, options.masterApiUrl ?? DEFAULT_MASTER_API_URL)

  if (!asset) {
    return {
      status: 'missing',
      graphicId,
      message: 'graphic_defines 未找到对应资源',
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
    const decoded = decodeSpecializationGraphicBuffer(asset, rawBuffer)
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
      graphicId,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function syncChampionSpecializationGraphics(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法根据 definitions 快照同步专精图')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const detailDir = path.resolve(options.detailDir ?? path.join(outputDir, 'champion-details'))
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const rawDefinitions = await readJson(input)
  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)
  const specializationGraphicIds = await collectSpecializationGraphicIds(detailDir)
  const assetDir = path.join(outputDir, SPECIALIZATION_GRAPHICS_DIR_NAME)

  await rm(assetDir, { recursive: true, force: true })
  await mkdir(assetDir, { recursive: true })

  const results = await runWithConcurrency(
    specializationGraphicIds,
    concurrency,
    (graphicId) =>
      downloadSpecializationGraphic(graphicId, graphicMap, {
        outputDir,
        currentVersion,
        masterApiUrl: options.masterApiUrl,
      }),
  )

  const items = results
    .filter((result) => result.status === 'ready')
    .map((result) => result.item)
    .sort(sortByGraphicId)
  const missing = results.filter((result) => result.status === 'missing')
  const updatedAt =
    typeof rawDefinitions.current_time === 'number'
      ? new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

  await writeJson(path.join(outputDir, `${SPECIALIZATION_GRAPHICS_DIR_NAME}.json`), {
    items,
    updatedAt,
  })

  console.log(
    `专精图同步完成：ready=${items.length}, missing=${missing.length}, dir=${assetDir}`,
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

async function main() {
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

  if (values.help) {
    console.log(`用法：
  node scripts/sync-idle-champions-specialization-graphics.mjs --input <definitions.json>

说明：
  从 champion-details 收集 specializationGraphicId，下载并写出详情页本地专精图资源。

常用参数：
  --input <file>         官方 definitions 快照
  --outputDir <dir>      输出目录，默认 ${DEFAULT_OUTPUT_DIR}
  --currentVersion <v>   当前版本号，默认 ${DEFAULT_CURRENT_VERSION}
  --detailDir <dir>      champion-details 目录，默认 <outputDir>/champion-details
  --concurrency <n>      并发数，默认 ${DEFAULT_CONCURRENCY}
`)
    return
  }

  await syncChampionSpecializationGraphics(values)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`同步专精图失败：${error.message}`)
    process.exitCode = 1
  })
}
