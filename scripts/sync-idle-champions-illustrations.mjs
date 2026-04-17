import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { createChampionGraphicResourceCache } from './data/champion-graphic-resource-cache.mjs'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.mjs'
import { renderSkelAnimPoseToPngBuffer } from './data/skelanim-renderer.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_VISUALS_FILE = 'champion-visuals.json'
const DEFAULT_ANIMATIONS_FILE = 'champion-animations.json'
const DEFAULT_CONCURRENCY = 6
const CHAMPION_ILLUSTRATION_DIR_NAME = 'champion-illustrations'

function buildIllustrationImagePath(currentVersion, group, id) {
  return `${currentVersion}/${CHAMPION_ILLUSTRATION_DIR_NAME}/${group}/${id}.png`
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

function buildAnimationMap(animationCollection) {
  return new Map((animationCollection?.items ?? []).map((item) => [item.id, item]))
}

function buildHeroIllustrationTasks(visuals, animationCollection) {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? null)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? null)
  const animationById = buildAnimationMap(animationCollection)
  const tasks = []

  if (skinIdFilter && !championIdFilter) {
    return tasks
  }

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
      animation: animationById.get(`hero:${visual.championId}`) ?? null,
      fallbackAsset: visual.base,
    })
  }

  return tasks
}

function buildSkinIllustrationTasks(visuals, animationCollection) {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? null)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? null)
  const animationById = buildAnimationMap(animationCollection)
  const tasks = []
  const missingSkinIds = []

  for (const visual of visuals.items ?? []) {
    if (championIdFilter && !championIdFilter.has(visual.championId)) {
      continue
    }

    for (const skin of visual.skins ?? []) {
      if (skinIdFilter && !skinIdFilter.has(skin.id)) {
        continue
      }

      const animation = animationById.get(`skin:${skin.id}`)

      if (!animation) {
        missingSkinIds.push(skin.id)
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
        animation,
        fallbackAsset: null,
      })
    }
  }

  if (missingSkinIds.length > 0) {
    throw new Error(`以下皮肤缺少本地动画清单，请先同步 champion-animations：${missingSkinIds.join(', ')}`)
  }

  return tasks
}

function resolvePublishedAssetFile(outputDir, currentVersion, assetPath) {
  if (!assetPath) {
    throw new Error('动画资源缺少 asset.path')
  }

  const normalizedPath = assetPath.replace(/^\/+/, '')
  const versionPrefix = `${currentVersion}/`
  const relativePath = normalizedPath.startsWith(versionPrefix)
    ? normalizedPath.slice(versionPrefix.length)
    : normalizedPath

  return path.join(outputDir, relativePath)
}

function normalizeAnimationIndexes(animation, taskId) {
  const sequenceIndex = Number(animation.defaultSequenceIndex)
  const frameIndex = Number(animation.defaultFrameIndex)

  if (!Number.isInteger(sequenceIndex) || sequenceIndex < 0) {
    throw new Error(`${taskId} 的 defaultSequenceIndex 无效`)
  }

  if (!Number.isInteger(frameIndex) || frameIndex < 0) {
    throw new Error(`${taskId} 的 defaultFrameIndex 无效`)
  }

  return { sequenceIndex, frameIndex }
}

async function renderAnimationIllustrationTask(task, outputDir, currentVersion) {
  if (task.animation.asset?.format !== 'skelanim-zlib') {
    throw new Error(`${task.id} 的动画资源格式不是 skelanim-zlib`)
  }

  const animationFile = resolvePublishedAssetFile(outputDir, currentVersion, task.animation.asset.path)
  const rawBuffer = await readFile(animationFile)
  const { sequenceIndex, frameIndex } = normalizeAnimationIndexes(task.animation, task.id)
  const skelAnim = decodeSkelAnimGraphicBuffer(
    {
      graphicId: task.animation.sourceGraphicId,
      sourceGraphic: task.animation.sourceGraphic,
      sourceVersion: task.animation.sourceVersion,
      remotePath: task.animation.asset.path,
      delivery: 'zlib-png',
    },
    rawBuffer,
  )
  const rendered = await renderSkelAnimPoseToPngBuffer(skelAnim, {
    sequenceIndex,
    frameIndex,
  })

  return {
    sourceSlot: task.animation.sourceSlot,
    sourceGraphicId: task.animation.sourceGraphicId,
    sourceGraphic: task.animation.sourceGraphic,
    sourceVersion: task.animation.sourceVersion,
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

async function renderFallbackIllustrationTask(task, graphicCache) {
  if (!task.fallbackAsset) {
    throw new Error(`${task.id} 缺少 fallbackAsset`)
  }

  const rendered = await graphicCache.renderIllustrationCandidate({
    slot: 'base',
    asset: task.fallbackAsset,
  })

  return {
    sourceSlot: 'base',
    sourceGraphicId: rendered.asset.graphicId,
    sourceGraphic: rendered.asset.sourceGraphic,
    sourceVersion: rendered.asset.sourceVersion,
    bytes: rendered.bytes,
    width: rendered.width,
    height: rendered.height,
    render: rendered.render,
  }
}

export async function syncChampionIllustrations(options = {}) {
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const visualsFile = path.resolve(options.visualsFile ?? path.join(outputDir, DEFAULT_VISUALS_FILE))
  const animationsFile = path.resolve(options.animationsFile ?? path.join(outputDir, DEFAULT_ANIMATIONS_FILE))
  const definitionsInput = options.input ? path.resolve(options.input) : null
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const championIdFilter = parseIdFilter(options.championIds ?? null)
  const skinIdFilter = parseIdFilter(options.skinIds ?? null)
  const hasSelectionFilters = Boolean(championIdFilter || skinIdFilter)
  const visuals = await readJson(visualsFile)
  const animations = await readJsonIfExists(animationsFile)
  const definitions = definitionsInput ? await readJson(definitionsInput) : null
  const graphicDefById = new Map((definitions?.graphic_defines ?? []).map((item) => [String(item.id), item]))
  const graphicCache = createChampionGraphicResourceCache({ graphicDefById })
  const filteredVisuals = {
    ...visuals,
    filters: {
      championIds: options.championIds ?? null,
      skinIds: options.skinIds ?? null,
    },
  }

  const illustrationRoot = path.join(outputDir, CHAMPION_ILLUSTRATION_DIR_NAME)
  const tasks = [
    ...buildHeroIllustrationTasks(filteredVisuals, animations),
    ...buildSkinIllustrationTasks(filteredVisuals, animations),
  ]
  const collectionFile = path.join(outputDir, 'champion-illustrations.json')

  if (!hasSelectionFilters) {
    await rm(illustrationRoot, { recursive: true, force: true })
  }

  await mkdir(path.join(illustrationRoot, 'heroes'), { recursive: true })
  await mkdir(path.join(illustrationRoot, 'skins'), { recursive: true })

  const writtenIllustrations = await runWithConcurrency(tasks, concurrency, async (task) => {
    const rendered = task.animation
      ? await renderAnimationIllustrationTask(task, outputDir, currentVersion)
      : await renderFallbackIllustrationTask(task, graphicCache)
    const outputFile = path.join(illustrationRoot, task.outputGroup, task.outputFileName)

    await writeFile(outputFile, rendered.bytes)

    return {
      id: task.id,
      championId: task.championId,
      skinId: task.skinId,
      kind: task.kind,
      seat: task.seat,
      championName: task.championName,
      illustrationName: task.illustrationName,
      portraitPath: task.portraitPath,
      sourceSlot: rendered.sourceSlot,
      sourceGraphicId: rendered.sourceGraphicId,
      sourceGraphic: rendered.sourceGraphic,
      sourceVersion: rendered.sourceVersion,
      render: rendered.render,
      image: {
        path: buildIllustrationImagePath(currentVersion, task.outputGroup, task.outputFileName.replace(/\.png$/u, '')),
        width: rendered.width,
        height: rendered.height,
        bytes: rendered.bytes.length,
        format: 'png',
      },
    }
  })

  const baseCollection = hasSelectionFilters ? await readJsonIfExists(collectionFile) : null
  const illustrationMap = new Map((baseCollection?.items ?? []).map((item) => [item.id, item]))

  for (const illustration of writtenIllustrations) {
    illustrationMap.set(illustration.id, illustration)
  }

  const sortedIllustrations = Array.from(illustrationMap.values()).sort(sortIllustrations)
  await writeFile(
    collectionFile,
    `${JSON.stringify({ items: sortedIllustrations, updatedAt: visuals.updatedAt }, null, 2)}\n`,
  )

  const totalBytes = sortedIllustrations.reduce((sum, item) => sum + item.image.bytes, 0)
  const heroCount = sortedIllustrations.filter((item) => item.kind === 'hero-base').length
  const skinCount = sortedIllustrations.filter((item) => item.kind === 'skin').length

  return {
    outputDir,
    visualsFile,
    animationsFile,
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
  node scripts/sync-idle-champions-illustrations.mjs [--input <definitions.json>] [--visualsFile <file>] [--animationsFile <file>] [--outputDir <dir>] [--championIds <ids>] [--skinIds <ids>]

说明：
  优先复用本地 champion-animations 清单中的默认 sequence/frame，把 hero-base / skin 的本地 .bin 渲染为站内静态 PNG；仅当 hero-base 不存在动画包时，才回退到直接静态渲染。
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      visualsFile: { type: 'string' },
      animationsFile: { type: 'string' },
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
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
  console.log(`- animations file: ${result.animationsFile}`)
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
