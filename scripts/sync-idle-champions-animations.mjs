import { access, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { createChampionGraphicResourceCache } from './data/champion-graphic-resource-cache.mjs'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.mjs'
import {
  resolvePreferredSequenceIndexes,
  scoreAnimationSequenceMetrics,
  selectAnimationIdleDefaultMetrics,
  summarizeAnimationSequence,
  summarizeAnimationSequenceMetrics,
} from './data/champion-animation-idle-selection.mjs'
import {
  DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
  readChampionAnimationIdleOverrides,
} from './data/champion-animation-idle-overrides.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_VISUALS_FILE = 'champion-visuals.json'
const DEFAULT_CONCURRENCY = 6
const DEFAULT_FPS = 24
const CHAMPION_ANIMATION_DIR_NAME = 'champion-animations'

function buildAnimationAssetPath(currentVersion, group, id) {
  return `${currentVersion}/${CHAMPION_ANIMATION_DIR_NAME}/${group}/${id}.bin`
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
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

function isSkelAnimGraphicDefinition(graphicDefinition) {
  return Number(graphicDefinition?.type) === 3
}

function isSkelAnimAsset(asset, graphicDefById) {
  const graphicDefinition = graphicDefById.get(String(asset.graphicId))
  return isSkelAnimGraphicDefinition(graphicDefinition) || asset.remotePath.includes('/Characters/')
}

function sortAnimations(left, right) {
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

function buildHeroAnimationTasks(visuals, graphicDefById) {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? null)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? null)
  const tasks = []

  if (skinIdFilter && !championIdFilter) {
    return tasks
  }

  for (const visual of visuals.items ?? []) {
    if (championIdFilter && !championIdFilter.has(visual.championId)) {
      continue
    }

    if (!visual.base || !isSkelAnimAsset(visual.base, graphicDefById)) {
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
      outputGroup: 'heroes',
      outputId: visual.championId,
      sourceSlot: 'base',
      asset: visual.base,
      graphicDefinition: graphicDefById.get(String(visual.base.graphicId)) ?? null,
    })
  }

  return tasks
}

function buildSkinAnimationTasks(visuals, graphicDefById) {
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

      const selected = [
        ['xl', skin.xl],
        ['large', skin.large],
        ['base', skin.base],
      ].find((candidate) => {
        const asset = candidate[1]

        if (!asset) {
          return false
        }

        return isSkelAnimAsset(asset, graphicDefById)
      })

      if (!selected) {
        continue
      }

      const [slot, asset] = selected
      tasks.push({
        id: `skin:${skin.id}`,
        championId: visual.championId,
        skinId: skin.id,
        kind: 'skin',
        seat: visual.seat,
        championName: visual.name,
        illustrationName: skin.name,
        outputGroup: 'skins',
        outputId: skin.id,
        sourceSlot: slot,
        asset,
        graphicDefinition: graphicDefById.get(String(asset.graphicId)) ?? null,
      })
    }
  }

  return tasks
}

function canReuseExistingAnimation(task, existingAnimation, currentVersion) {
  if (!existingAnimation) {
    return false
  }

  return (
    existingAnimation.id === task.id &&
    existingAnimation.kind === task.kind &&
    existingAnimation.championId === task.championId &&
    (existingAnimation.skinId ?? null) === (task.skinId ?? null) &&
    existingAnimation.sourceSlot === task.sourceSlot &&
    existingAnimation.sourceGraphicId === task.asset.graphicId &&
    existingAnimation.sourceGraphic === task.asset.sourceGraphic &&
    (existingAnimation.sourceVersion ?? null) === (task.asset.sourceVersion ?? null) &&
    existingAnimation.asset?.path === buildAnimationAssetPath(currentVersion, task.outputGroup, task.outputId) &&
    existingAnimation.asset?.format === 'skelanim-zlib'
  )
}

function decodeAnimationGraphic(task, rawBuffer) {
  return decodeSkelAnimGraphicBuffer(
    {
      graphicId: task.asset.graphicId,
      sourceGraphic: task.asset.sourceGraphic,
      sourceVersion: task.asset.sourceVersion,
      remotePath: task.asset.remotePath,
      delivery: task.asset.delivery,
    },
    rawBuffer,
  )
}

function selectDefaultSequenceForTask(task, character, animationIdleOverride) {
  const preferredSequenceIndexes = resolvePreferredSequenceIndexes(task.graphicDefinition)
  const sequenceSummaries = character.sequences.map(summarizeAnimationSequence)
  const sequenceSummaryByIndex = new Map(sequenceSummaries.map((item) => [item.sequenceIndex, item]))
  const scoredMetrics = scoreAnimationSequenceMetrics(
    character.sequences.map((sequence) =>
      summarizeAnimationSequenceMetrics(sequence, sequenceSummaryByIndex.get(sequence.sequenceIndex) ?? null),
    ),
  )
  const selectedMetrics = selectAnimationIdleDefaultMetrics({
    scoredMetrics,
    preferredSequenceIndexes,
    blockedSequenceIndexes: animationIdleOverride?.blockedSequenceIndexes ?? [],
    fixedSequenceIndex: animationIdleOverride?.fixedSequenceIndex ?? null,
  })

  if (!selectedMetrics) {
    throw new Error(`${task.id} 没有可播放的 sequence`)
  }

  return {
    selectedMetrics,
    sequenceSummaries,
  }
}

async function cleanupAnimationDir(dirPath, expectedFiles) {
  await mkdir(dirPath, { recursive: true })

  for (const fileName of await readdir(dirPath)) {
    if (expectedFiles.has(fileName)) {
      continue
    }

    await unlink(path.join(dirPath, fileName))
  }
}

export async function syncChampionAnimations(options = {}) {
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const visualsFile = path.resolve(options.visualsFile ?? path.join(outputDir, DEFAULT_VISUALS_FILE))
  const definitionsInput = options.input ? path.resolve(options.input) : null
  const idleOverridesFile = path.resolve(
    options.idleOverridesFile ?? DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
  )
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const championIdFilter = parseIdFilter(options.championIds ?? null)
  const skinIdFilter = parseIdFilter(options.skinIds ?? null)
  const hasSelectionFilters = Boolean(championIdFilter || skinIdFilter)
  const visuals = await readJson(visualsFile)
  const definitions = definitionsInput ? await readJson(definitionsInput) : null
  const graphicDefById = new Map((definitions?.graphic_defines ?? []).map((item) => [String(item.id), item]))
  const filteredVisuals = {
    ...visuals,
    filters: {
      championIds: options.championIds ?? null,
      skinIds: options.skinIds ?? null,
    },
  }
  const graphicCache = createChampionGraphicResourceCache()
  const animationRoot = path.join(outputDir, CHAMPION_ANIMATION_DIR_NAME)
  const collectionFile = path.join(outputDir, 'champion-animations.json')
  const tasks = [
    ...buildHeroAnimationTasks(filteredVisuals, graphicDefById),
    ...buildSkinAnimationTasks(filteredVisuals, graphicDefById),
  ]
  const baseCollection = await readJsonIfExists(collectionFile)
  const existingAnimationMap = new Map((baseCollection?.items ?? []).map((item) => [item.id, item]))
  const idleOverrides = await readChampionAnimationIdleOverrides(idleOverridesFile)

  await mkdir(path.join(animationRoot, 'heroes'), { recursive: true })
  await mkdir(path.join(animationRoot, 'skins'), { recursive: true })

  const writtenAnimations = await runWithConcurrency(tasks, concurrency, async (task) => {
    const outputFile = path.join(animationRoot, task.outputGroup, `${task.outputId}.bin`)
    const existingAnimation = existingAnimationMap.get(task.id)
    const canReuse =
      canReuseExistingAnimation(task, existingAnimation, currentVersion) && (await pathExists(outputFile))
    const rawBuffer = canReuse ? await readFile(outputFile) : await graphicCache.readRawGraphicBuffer(task.asset)
    const decoded = decodeAnimationGraphic(task, rawBuffer)
    const character = decoded.characters[0]

    if (!character) {
      throw new Error(`${task.id} 缺少可用角色数据`)
    }

    const { selectedMetrics, sequenceSummaries } = selectDefaultSequenceForTask(
      task,
      character,
      idleOverrides.get(task.id) ?? null,
    )

    if (!canReuse) {
      await writeFile(outputFile, rawBuffer)
    }

    return {
      mode: canReuse ? 'reused' : 'downloaded',
      item: {
        id: task.id,
        championId: task.championId,
        skinId: task.skinId,
        kind: task.kind,
        seat: task.seat,
        championName: task.championName,
        illustrationName: task.illustrationName,
        sourceSlot: task.sourceSlot,
        sourceGraphicId: task.asset.graphicId,
        sourceGraphic: task.asset.sourceGraphic,
        sourceVersion: task.asset.sourceVersion,
        fps: existingAnimation?.fps ?? DEFAULT_FPS,
        defaultSequenceIndex: selectedMetrics.sequenceIndex,
        defaultFrameIndex: selectedMetrics.frameIndex ?? 0,
        asset: {
          path: buildAnimationAssetPath(currentVersion, task.outputGroup, task.outputId),
          bytes: canReuse ? (existingAnimation?.asset?.bytes ?? rawBuffer.length) : rawBuffer.length,
          format: 'skelanim-zlib',
        },
        sequences: sequenceSummaries,
      },
    }
  })
  const downloadedCount = writtenAnimations.filter((entry) => entry.mode === 'downloaded').length
  const reusedCount = writtenAnimations.length - downloadedCount
  const nextAnimations = writtenAnimations.map((entry) => entry.item)
  const animationMap = hasSelectionFilters
    ? new Map((baseCollection?.items ?? []).map((item) => [item.id, item]))
    : new Map()

  for (const animation of nextAnimations) {
    animationMap.set(animation.id, animation)
  }

  const sortedAnimations = Array.from(animationMap.values()).sort(sortAnimations)
  await writeFile(
    collectionFile,
    `${JSON.stringify({ items: sortedAnimations, updatedAt: visuals.updatedAt }, null, 2)}\n`,
  )

  if (!hasSelectionFilters) {
    await cleanupAnimationDir(
      path.join(animationRoot, 'heroes'),
      new Set(nextAnimations.filter((item) => item.kind === 'hero-base').map((item) => `${item.championId}.bin`)),
    )
    await cleanupAnimationDir(
      path.join(animationRoot, 'skins'),
      new Set(nextAnimations.filter((item) => item.kind === 'skin').map((item) => `${item.skinId}.bin`)),
    )
  }

  const heroCount = sortedAnimations.filter((item) => item.kind === 'hero-base').length
  const skinCount = sortedAnimations.filter((item) => item.kind === 'skin').length

  return {
    outputDir,
    visualsFile,
    currentVersion,
    totalBytes: sortedAnimations.reduce((sum, item) => sum + item.asset.bytes, 0),
    count: sortedAnimations.length,
    heroCount,
    skinCount,
    downloadedCount,
    reusedCount,
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/sync-idle-champions-animations.mjs [--input <definitions.json>] [--visualsFile <file>] [--outputDir <dir>] [--idleOverridesFile <file>] [--championIds <ids>] [--skinIds <ids>]

说明：
  基于 champion-visuals.json 选择可播放的 hero-base / skin SkelAnim 原始资源，输出供前端 canvas 动画播放和静态默认帧渲染复用的本地二进制资源与索引清单。
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      visualsFile: { type: 'string' },
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
      concurrency: { type: 'string' },
      idleOverridesFile: { type: 'string' },
      championIds: { type: 'string' },
      skinIds: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    printUsage()
    return
  }

  const result = await syncChampionAnimations(values)
  console.log(`动画资源同步完成：`)
  console.log(`- output dir: ${result.outputDir}`)
  console.log(`- hero animations: ${result.heroCount}`)
  console.log(`- skin animations: ${result.skinCount}`)
  console.log(`- total count: ${result.count}`)
  console.log(`- total bytes: ${result.totalBytes}`)
  console.log(`- downloaded: ${result.downloadedCount}`)
  console.log(`- reused: ${result.reusedCount}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`同步动画资源失败：${error.message}`)
    process.exitCode = 1
  })
}
