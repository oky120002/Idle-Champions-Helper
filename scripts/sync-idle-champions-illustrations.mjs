import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { decodeRemoteGraphicBuffer, readPngDimensions } from './data/mobile-asset-codec.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_VISUALS_FILE = 'champion-visuals.json'
const DEFAULT_CONCURRENCY = 6
const CHAMPION_ILLUSTRATION_DIR_NAME = 'champion-illustrations'

const SLOT_PRIORITY = {
  large: 3,
  base: 2,
  xl: 1,
}

function buildIllustrationImagePath(currentVersion, group, id) {
  return `${currentVersion}/${CHAMPION_ILLUSTRATION_DIR_NAME}/${group}/${id}.png`
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function compareCandidateMetrics(left, right) {
  const leftPixels = left.width * left.height
  const rightPixels = right.width * right.height

  if (leftPixels !== rightPixels) {
    return rightPixels - leftPixels
  }

  if (left.height !== right.height) {
    return right.height - left.height
  }

  return (SLOT_PRIORITY[right.slot] ?? 0) - (SLOT_PRIORITY[left.slot] ?? 0)
}

function sortIllustrations(left, right) {
  return (
    left.seat - right.seat ||
    left.championName.display.localeCompare(right.championName.display) ||
    left.championName.original.localeCompare(right.championName.original) ||
    (left.kind === right.kind ? 0 : left.kind === 'hero-base' ? -1 : 1) ||
    left.illustrationName.display.localeCompare(right.illustrationName.display) ||
    left.illustrationName.original.localeCompare(right.illustrationName.original) ||
    left.id.localeCompare(right.id)
  )
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

async function fetchDecodedCandidate(asset) {
  const response = await fetch(asset.remoteUrl, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`下载资源失败：HTTP ${response.status}`)
  }

  const decodedBuffer = decodeRemoteGraphicBuffer(asset, Buffer.from(await response.arrayBuffer()))
  const dimensions = readPngDimensions(decodedBuffer)

  return {
    asset,
    bytes: decodedBuffer,
    width: dimensions.width,
    height: dimensions.height,
  }
}

async function selectBestIllustrationCandidate(entry) {
  const candidates = []
  const errors = []

  for (const candidate of entry.candidates) {
    try {
      const decoded = await fetchDecodedCandidate(candidate.asset)
      candidates.push({
        slot: candidate.slot,
        ...decoded,
      })
    } catch (error) {
      errors.push({
        slot: candidate.slot,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (candidates.length === 0) {
    const message = errors.map((item) => `${item.slot}:${item.message}`).join(' | ') || '没有可用候选资源'
    throw new Error(`${entry.id} 无法生成立绘：${message}`)
  }

  candidates.sort(compareCandidateMetrics)
  return candidates[0]
}

function buildHeroIllustrationTasks(visuals) {
  const tasks = []

  for (const visual of visuals.items ?? []) {
    if (!visual.base) {
      continue
    }

    tasks.push({
      id: `hero:${visual.championId}`,
      championId: visual.championId,
      skinId: null,
      kind: 'hero-base',
      seat: visual.seat,
      championName: visual.name,
      illustrationName: visual.name,
      portraitPath: visual.portrait?.localPath ?? null,
      outputGroup: 'heroes',
      outputFileName: `${visual.championId}.png`,
      candidates: [{ slot: 'base', asset: visual.base }],
    })
  }

  return tasks
}

function buildSkinIllustrationTasks(visuals) {
  const tasks = []

  for (const visual of visuals.items ?? []) {
    for (const skin of visual.skins ?? []) {
      const candidates = [
        skin.large ? { slot: 'large', asset: skin.large } : null,
        skin.base ? { slot: 'base', asset: skin.base } : null,
        skin.xl ? { slot: 'xl', asset: skin.xl } : null,
      ].filter(Boolean)

      if (candidates.length === 0) {
        continue
      }

      tasks.push({
        id: `skin:${skin.id}`,
        championId: visual.championId,
        skinId: skin.id,
        kind: 'skin',
        seat: visual.seat,
        championName: visual.name,
        illustrationName: skin.name,
        portraitPath: visual.portrait?.localPath ?? null,
        outputGroup: 'skins',
        outputFileName: `${skin.id}.png`,
        candidates,
      })
    }
  }

  return tasks
}

export async function syncChampionIllustrations(options = {}) {
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const visualsFile = path.resolve(options.visualsFile ?? path.join(outputDir, DEFAULT_VISUALS_FILE))
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const visuals = await readJson(visualsFile)

  const illustrationRoot = path.join(outputDir, CHAMPION_ILLUSTRATION_DIR_NAME)
  const tasks = [
    ...buildHeroIllustrationTasks(visuals),
    ...buildSkinIllustrationTasks(visuals),
  ]

  await rm(illustrationRoot, { recursive: true, force: true })
  await mkdir(path.join(illustrationRoot, 'heroes'), { recursive: true })
  await mkdir(path.join(illustrationRoot, 'skins'), { recursive: true })

  const writtenIllustrations = await runWithConcurrency(tasks, concurrency, async (task) => {
    const selected = await selectBestIllustrationCandidate(task)
    const outputFile = path.join(illustrationRoot, task.outputGroup, task.outputFileName)

    await writeFile(outputFile, selected.bytes)

    return {
      id: task.id,
      championId: task.championId,
      skinId: task.skinId,
      kind: task.kind,
      seat: task.seat,
      championName: task.championName,
      illustrationName: task.illustrationName,
      portraitPath: task.portraitPath,
      sourceSlot: selected.slot,
      sourceGraphicId: selected.asset.graphicId,
      sourceGraphic: selected.asset.sourceGraphic,
      sourceVersion: selected.asset.sourceVersion,
      image: {
        path: buildIllustrationImagePath(currentVersion, task.outputGroup, task.outputFileName.replace(/\.png$/u, '')),
        width: selected.width,
        height: selected.height,
        bytes: selected.bytes.length,
        format: 'png',
      },
    }
  })

  const sortedIllustrations = writtenIllustrations.sort(sortIllustrations)
  await writeFile(
    path.join(outputDir, 'champion-illustrations.json'),
    `${JSON.stringify({ items: sortedIllustrations, updatedAt: visuals.updatedAt }, null, 2)}\n`,
  )

  const totalBytes = sortedIllustrations.reduce((sum, item) => sum + item.image.bytes, 0)
  const heroCount = sortedIllustrations.filter((item) => item.kind === 'hero-base').length
  const skinCount = sortedIllustrations.filter((item) => item.kind === 'skin').length

  return {
    outputDir,
    visualsFile,
    currentVersion,
    totalBytes,
    counts: {
      heroIllustrations: heroCount,
      skinIllustrations: skinCount,
      totalIllustrations: sortedIllustrations.length,
    },
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/sync-idle-champions-illustrations.mjs [--visualsFile <file>] [--outputDir <dir>]

说明：
  基于 champion-visuals.json 拉取并写出页面可直接消费的本地立绘资源。
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      visualsFile: { type: 'string' },
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
      concurrency: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    printUsage()
    return
  }

  const result = await syncChampionIllustrations(values)

  console.log(`立绘静态资源同步完成：`)
  console.log(`- visuals file: ${result.visualsFile}`)
  console.log(`- output dir: ${result.outputDir}`)
  console.log(`- hero illustrations: ${result.counts.heroIllustrations}`)
  console.log(`- skin illustrations: ${result.counts.skinIllustrations}`)
  console.log(`- total illustrations: ${result.counts.totalIllustrations}`)
  console.log(`- total bytes: ${result.totalBytes}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`同步立绘资源失败：${error.message}`)
    process.exitCode = 1
  })
}
