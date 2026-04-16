import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { decodeRemoteGraphicBuffer, readPngDimensions } from './data/mobile-asset-codec.mjs'
import {
  loadChampionIllustrationOverrides,
  resolveChampionIllustrationOverride,
} from './data/champion-illustration-overrides.mjs'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.mjs'
import { renderSkelAnimPoseToPngBuffer } from './data/skelanim-renderer.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_VISUALS_FILE = 'champion-visuals.json'
const DEFAULT_ILLUSTRATION_OVERRIDES = 'scripts/data/champion-illustration-overrides.json'
const DEFAULT_CONCURRENCY = 6
const CHAMPION_ILLUSTRATION_DIR_NAME = 'champion-illustrations'

const SLOT_PRIORITY = {
  xl: 3,
  large: 2,
  base: 1,
}

function buildIllustrationImagePath(currentVersion, group, id) {
  return `${currentVersion}/${CHAMPION_ILLUSTRATION_DIR_NAME}/${group}/${id}.png`
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

function parseIdFilter(rawValue) {
  if (!rawValue) {
    return null
  }

  const ids = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return ids.length > 0 ? new Set(ids) : null
}

function compareCandidateMetrics(left, right) {
  const leftSlotPriority = SLOT_PRIORITY[left.slot] ?? 0
  const rightSlotPriority = SLOT_PRIORITY[right.slot] ?? 0

  if (leftSlotPriority !== rightSlotPriority) {
    return rightSlotPriority - leftSlotPriority
  }

  const leftStatic = Boolean(left.render?.isStaticPose)
  const rightStatic = Boolean(right.render?.isStaticPose)

  if (leftStatic !== rightStatic) {
    return rightStatic ? 1 : -1
  }

  const leftPixels = left.width * left.height
  const rightPixels = right.width * right.height

  if (leftPixels !== rightPixels) {
    return rightPixels - leftPixels
  }

  if (left.height !== right.height) {
    return right.height - left.height
  }

  return 0
}

function compareCandidatePriority(left, right) {
  const leftPriority = left.manualOverride?.priorityScore ?? 0
  const rightPriority = right.manualOverride?.priorityScore ?? 0

  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority
  }

  return compareCandidateMetrics(left, right)
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

function isSkelAnimAsset(asset) {
  return asset.remotePath.includes('/Characters/')
}

function mergePreferredIndexes(...groups) {
  const ordered = []
  const seen = new Set()

  for (const group of groups) {
    for (const value of group ?? []) {
      if (!Number.isInteger(value) || value < 0 || seen.has(value)) {
        continue
      }

      seen.add(value)
      ordered.push(value)
    }
  }

  return ordered
}

function resolvePreferredSequenceIndexes(asset, graphicDefById) {
  const graphicDef = graphicDefById.get(String(asset.graphicId))
  const sequenceOverride = graphicDef?.export_params?.sequence_override

  if (!Array.isArray(sequenceOverride) || sequenceOverride.length === 0) {
    return []
  }

  return sequenceOverride
    .map((value) => Number(value) - 1)
    .filter((value) => Number.isInteger(value) && value >= 0)
}

async function fetchDecodedCandidate(candidate, graphicDefById, manualOverride = null) {
  const { asset } = candidate
  const response = await fetch(asset.remoteUrl, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`下载资源失败：HTTP ${response.status}`)
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer())

  if (isSkelAnimAsset(asset)) {
    const skelAnim = decodeSkelAnimGraphicBuffer(asset, rawBuffer)
    const rendered = await renderSkelAnimPoseToPngBuffer(skelAnim, {
      preferredSequenceIndexes: mergePreferredIndexes(
        manualOverride?.preferredSequenceIndexes ?? [],
        resolvePreferredSequenceIndexes(asset, graphicDefById),
      ),
      preferredFrameIndexes: manualOverride?.preferredFrameIndexes ?? [],
    })

    return {
      asset,
      bytes: rendered.bytes,
      width: rendered.width,
      height: rendered.height,
      render: {
        pipeline: 'skelanim',
        sequenceIndex: rendered.render.sequenceIndex,
        sequenceLength: rendered.render.sequenceLength,
        isStaticPose: rendered.render.isStaticPose,
        frameIndex: rendered.render.frameIndex,
        visiblePieceCount: rendered.render.visiblePieceCount,
        bounds: rendered.render.bounds,
      },
    }
  }

  const decodedBuffer = decodeRemoteGraphicBuffer(asset, rawBuffer)
  const dimensions = readPngDimensions(decodedBuffer)

  return {
    asset,
    bytes: decodedBuffer,
    width: dimensions.width,
    height: dimensions.height,
      render: {
        pipeline: 'decoded-png',
        sequenceIndex: null,
        sequenceLength: null,
        isStaticPose: null,
        frameIndex: null,
        visiblePieceCount: null,
        bounds: null,
    },
  }
}

async function selectBestIllustrationCandidate(entry, graphicDefById) {
  const candidates = []
  const errors = []

  for (const candidate of entry.candidates) {
    const manualOverride = resolveChampionIllustrationOverride(entry, candidate, entry.illustrationOverrides)

    try {
      const decoded = await fetchDecodedCandidate(candidate, graphicDefById, manualOverride)
      candidates.push({
        slot: candidate.slot,
        manualOverride,
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

  candidates.sort(compareCandidatePriority)
  return candidates[0]
}

function buildHeroIllustrationTasks(visuals) {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? null)
  const tasks = []

  for (const visual of visuals.items ?? []) {
    if (championIdFilter && !championIdFilter.has(visual.championId)) {
      continue
    }

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
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? null)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? null)
  const tasks = []

  for (const visual of visuals.items ?? []) {
    if (championIdFilter && !championIdFilter.has(visual.championId)) {
      continue
    }

    for (const skin of visual.skins ?? []) {
      if (skinIdFilter && !skinIdFilter.has(skin.id)) {
        continue
      }

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
  const illustrationOverridesFile = path.resolve(options.illustrationOverrides ?? DEFAULT_ILLUSTRATION_OVERRIDES)
  const definitionsInput = options.input ? path.resolve(options.input) : null
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const visuals = await readJson(visualsFile)
  const definitions = definitionsInput ? await readJson(definitionsInput) : null
  const illustrationOverrides = await loadChampionIllustrationOverrides(illustrationOverridesFile)
  const graphicDefById = new Map((definitions?.graphic_defines ?? []).map((item) => [String(item.id), item]))
  const filteredVisuals = {
    ...visuals,
    filters: {
      championIds: options.championIds ?? null,
      skinIds: options.skinIds ?? null,
    },
  }

  const illustrationRoot = path.join(outputDir, CHAMPION_ILLUSTRATION_DIR_NAME)
  const tasks = [
    ...buildHeroIllustrationTasks(filteredVisuals),
    ...buildSkinIllustrationTasks(filteredVisuals),
  ].map((task) => ({
    ...task,
    illustrationOverrides,
  }))

  await rm(illustrationRoot, { recursive: true, force: true })
  await mkdir(path.join(illustrationRoot, 'heroes'), { recursive: true })
  await mkdir(path.join(illustrationRoot, 'skins'), { recursive: true })

  const writtenIllustrations = await runWithConcurrency(tasks, concurrency, async (task) => {
    const selected = await selectBestIllustrationCandidate(task, graphicDefById)
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
      manualOverride: selected.manualOverride?.audit ?? null,
      render: selected.render,
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
  node scripts/sync-idle-champions-illustrations.mjs [--input <definitions.json>] [--visualsFile <file>] [--outputDir <dir>] [--illustrationOverrides <file>]

说明：
  基于 champion-visuals.json 拉取、解析 SkelAnim 并写出页面可直接消费的本地立绘资源。
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      visualsFile: { type: 'string' },
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
      illustrationOverrides: { type: 'string' },
      concurrency: { type: 'string' },
      championIds: { type: 'string' },
      skinIds: { type: 'string' },
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
