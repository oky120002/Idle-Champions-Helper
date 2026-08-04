import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import type { LocalizedText } from '../src/domain/types/common.ts'
import {
  parseIdFilter,
  readJson,
  readJsonIfExists,
  runWithConcurrency,
} from './data/io-utils.ts'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.ts'
import { renderSkelAnimPoseToPngBuffer, type SkelAnimFrameBounds } from './data/skelanim-renderer.ts'
import { resolveWalkPosterPose } from './data/skelanim-walk-selection.ts'
import {
  fileExists,
  readExistingCollection,
  removeUnexpectedFiles,
  shouldSkipResourceSync,
} from './data/resource-sync-policy.ts'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_VISUALS_FILE = 'champion-visuals.json'
const DEFAULT_ANIMATIONS_FILE = 'champion-animations.json'
const DEFAULT_CONCURRENCY = 6
const CHAMPION_ILLUSTRATION_DIR_NAME = 'champion-illustrations'

interface IllustrationBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface AnimationSequenceSummary {
  sequenceIndex: number
  frameCount: number
  pieceCount: number
  firstRenderableFrameIndex: number | null
  bounds: IllustrationBounds | null
}

interface AnimationAsset {
  path: string
  bytes: number
  format: 'skelanim-zlib'
}

interface AnimationItem {
  id: string
  sequences: AnimationSequenceSummary[]
  defaultSequenceIndex: number
  defaultFrameIndex: number
  asset: AnimationAsset
  sourceSlot: string
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
}

interface AnimationCollection {
  items: AnimationItem[]
  updatedAt?: unknown
}

interface VisualsFilters {
  championIds: string | null
  skinIds: string | null
}

interface ChampionVisualsCollection {
  items?: ChampionVisualEntry[]
  updatedAt: string
  filters?: VisualsFilters | null
}

interface ChampionVisualEntry {
  championId: string
  seat: number
  name: LocalizedText
  portrait?: { localPath: string } | null
  skins?: SkinVisualEntry[]
}

interface SkinVisualEntry {
  id: string
  name: LocalizedText
}

type IllustrationKind = 'hero-base' | 'skin'

interface IllustrationImage {
  path: string
  width: number
  height: number
  bytes: number
  format: 'png'
}

interface IllustrationRender {
  pipeline: 'skelanim'
  sequenceIndex: number
  sequenceLength: number
  isStaticPose: boolean
  frameIndex: number
  visiblePieceCount: number
  bounds: IllustrationBounds
}

interface ChampionIllustrationEntry {
  id: string
  championId: string
  skinId: string | null
  kind: IllustrationKind
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  portraitPath: string | null
  sourceSlot: string
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  render: IllustrationRender
  image: IllustrationImage
}

interface IllustrationTask {
  id: string
  championId: string
  skinId: string | null
  kind: IllustrationKind
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  portraitPath: string | null
  outputGroup: 'heroes' | 'skins'
  outputFileName: string
  animation: AnimationItem
}

interface RenderedAnimation {
  sourceSlot: string
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  bytes: Buffer
  width: number
  height: number
  render: IllustrationRender
}

interface SyncChampionIllustrationsOptions {
  outputDir?: string | undefined
  currentVersion?: string | undefined
  visualsFile?: string | undefined
  animationsFile?: string | undefined
  concurrency?: string | undefined
  championIds?: string | undefined
  skinIds?: string | undefined
}

interface SyncChampionIllustrationsResult {
  outputDir: string
  visualsFile: string
  animationsFile: string
  currentVersion: string
  totalBytes: number
  counts: {
    heroIllustrations: number
    skinIllustrations: number
    totalIllustrations: number
  }
  renderedCount: number
  reusedCount: number
  skipped?: boolean
}

// resolveWalkPosterPose 的 manifest 参数要求 sequences[].bounds 非空，实际数据可能为 null；
// walk-selection 内部通过 ?? item.bounds fallback 处理了 null bounds。
type WalkManifestLike = {
  sequences: { sequenceIndex: number; bounds: IllustrationBounds }[]
  defaultSequenceIndex: number
  defaultFrameIndex: number
}

function buildIllustrationImagePath(currentVersion: string, group: string, id: string): string {
  return `${currentVersion}/${CHAMPION_ILLUSTRATION_DIR_NAME}/${group}/${id}.png`
}

function sortIllustrations(left: ChampionIllustrationEntry, right: ChampionIllustrationEntry): number {
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

function buildAnimationMap(
  animationCollection: AnimationCollection | null | undefined,
): Map<string, AnimationItem> {
  return new Map((animationCollection?.items ?? []).map((item) => [item.id, item]))
}

function buildHeroIllustrationTasks(
  visuals: ChampionVisualsCollection,
  animationCollection: AnimationCollection | null,
): IllustrationTask[] {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? undefined)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? undefined)
  const animationById = buildAnimationMap(animationCollection)
  const tasks: IllustrationTask[] = []
  const missingHeroIds: string[] = []

  if (skinIdFilter && !championIdFilter) {
    return tasks
  }

  for (const visual of visuals.items ?? []) {
    if (championIdFilter && !championIdFilter.has(visual.championId)) {
      continue
    }

    const animation = animationById.get(`hero:${visual.championId}`)

    if (!animation) {
      missingHeroIds.push(visual.championId)
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
      animation,
    })
  }

  if (missingHeroIds.length > 0) {
    throw new Error(`以下英雄缺少本地动画清单，请先同步 champion-animations：${missingHeroIds.join(', ')}`)
  }

  return tasks
}

function buildSkinIllustrationTasks(
  visuals: ChampionVisualsCollection,
  animationCollection: AnimationCollection | null,
): IllustrationTask[] {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? undefined)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? undefined)
  const animationById = buildAnimationMap(animationCollection)
  const tasks: IllustrationTask[] = []
  const missingSkinIds: string[] = []

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
      })
    }
  }

  if (missingSkinIds.length > 0) {
    throw new Error(`以下皮肤缺少本地动画清单，请先同步 champion-animations：${missingSkinIds.join(', ')}`)
  }

  return tasks
}

function resolvePublishedAssetFile(outputDir: string, currentVersion: string, assetPath: string): string {
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

function normalizeAnimationIndexes(animation: AnimationItem, taskId: string): {
  sequenceIndex: number
  frameIndex: number
} {
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

function resolveIllustrationRasterScale(viewportBounds: IllustrationBounds): number {
  const width = Math.max(1, Math.ceil(viewportBounds.maxX - viewportBounds.minX))
  const height = Math.max(1, Math.ceil(viewportBounds.maxY - viewportBounds.minY))
  const maxEdge = Math.max(width, height)

  if (maxEdge >= 320) {
    return 1
  }

  return 2
}

async function renderAnimationIllustrationTask(
  task: IllustrationTask,
  outputDir: string,
  currentVersion: string,
): Promise<RenderedAnimation> {
  if (task.animation.asset?.format !== 'skelanim-zlib') {
    throw new Error(`${task.id} 的动画资源格式不是 skelanim-zlib`)
  }

  const animationFile = resolvePublishedAssetFile(outputDir, currentVersion, task.animation.asset.path)
  const rawBuffer = await readFile(animationFile)
  const { sequenceIndex, frameIndex } = normalizeAnimationIndexes(task.animation, task.id)
  // decodeSkelAnimGraphicBuffer 只读 delivery；其余字段保留给下游断点审查
  const skelAnimSource = {
    graphicId: task.animation.sourceGraphicId,
    sourceGraphic: task.animation.sourceGraphic,
    sourceVersion: task.animation.sourceVersion,
    remotePath: task.animation.asset.path,
    delivery: 'zlib-png',
  }
  const skelAnim = decodeSkelAnimGraphicBuffer(skelAnimSource, rawBuffer)
  const walkPosterPose = resolveWalkPosterPose(task.animation as WalkManifestLike, skelAnim)
  const viewportBounds = walkPosterPose?.viewportBounds
  // renderer 只读 viewportBounds.minX/minY/maxX/maxY；WalkBounds 缺少 width/height/visiblePieceCount
  // 但 renderer 不读这些字段，as SkelAnimFrameBounds 是安全的。
  const rendered = await renderSkelAnimPoseToPngBuffer(skelAnim, {
    sequenceIndex: walkPosterPose?.sequenceIndex ?? sequenceIndex,
    frameIndex: walkPosterPose?.frameIndex ?? frameIndex,
    ...(viewportBounds
      ? {
          viewportBounds: viewportBounds as SkelAnimFrameBounds,
          rasterScale: resolveIllustrationRasterScale(viewportBounds),
        }
      : { rasterScale: 1 }),
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

function canReuseIllustrationMetadata(
  task: IllustrationTask,
  existingIllustration: ChampionIllustrationEntry | undefined,
  currentVersion: string,
): existingIllustration is ChampionIllustrationEntry {
  if (!existingIllustration) {
    return false
  }

  return (
    existingIllustration.id === task.id &&
    existingIllustration.kind === task.kind &&
    existingIllustration.championId === task.championId &&
    (existingIllustration.skinId ?? null) === (task.skinId ?? null) &&
    existingIllustration.sourceSlot === task.animation.sourceSlot &&
    existingIllustration.sourceGraphicId === task.animation.sourceGraphicId &&
    existingIllustration.sourceGraphic === task.animation.sourceGraphic &&
    (existingIllustration.sourceVersion ?? null) === (task.animation.sourceVersion ?? null) &&
    existingIllustration.image?.path ===
      buildIllustrationImagePath(
        currentVersion,
        task.outputGroup,
        task.outputFileName.replace(/\.png$/u, ''),
      )
  )
}

export async function syncChampionIllustrations(
  options: SyncChampionIllustrationsOptions = {},
): Promise<SyncChampionIllustrationsResult> {
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const visualsFile = path.resolve(options.visualsFile ?? path.join(outputDir, DEFAULT_VISUALS_FILE))
  const animationsFile = path.resolve(
    options.animationsFile ?? path.join(outputDir, DEFAULT_ANIMATIONS_FILE),
  )
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const championIdFilter = parseIdFilter(options.championIds ?? undefined)
  const skinIdFilter = parseIdFilter(options.skinIds ?? undefined)
  const hasSelectionFilters = Boolean(championIdFilter || skinIdFilter)
  const visuals = (await readJson(visualsFile)) as ChampionVisualsCollection
  const animations = (await readJsonIfExists(animationsFile)) as AnimationCollection | null
  const filteredVisuals: ChampionVisualsCollection = {
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
  const baseCollection = await readExistingCollection(collectionFile)

  if (
    !hasSelectionFilters &&
    shouldSkipResourceSync({
      existingUpdatedAt: baseCollection?.updatedAt,
      nextUpdatedAt: animations?.updatedAt ?? visuals.updatedAt,
    })
  ) {
    const existingItems = (baseCollection?.items ?? []) as ChampionIllustrationEntry[]
    return {
      outputDir,
      visualsFile,
      animationsFile,
      currentVersion,
      totalBytes: existingItems.reduce((sum, item) => sum + (item.image?.bytes ?? 0), 0),
      counts: {
        heroIllustrations: existingItems.filter((item) => item.kind === 'hero-base').length,
        skinIllustrations: existingItems.filter((item) => item.kind === 'skin').length,
        totalIllustrations: existingItems.length,
      },
      reusedCount: existingItems.length,
      renderedCount: 0,
      skipped: true,
    }
  }

  await mkdir(path.join(illustrationRoot, 'heroes'), { recursive: true })
  await mkdir(path.join(illustrationRoot, 'skins'), { recursive: true })
  const existingIllustrationMap = new Map<string, ChampionIllustrationEntry>(
    (baseCollection?.items ?? []).map((item) => {
      const entry = item as ChampionIllustrationEntry
      return [entry.id, entry]
    }),
  )

  const writtenIllustrations = await runWithConcurrency(tasks, concurrency, async (task) => {
    const rendered = await renderAnimationIllustrationTask(task, outputDir, currentVersion)
    const outputFile = path.join(illustrationRoot, task.outputGroup, task.outputFileName)
    const nextIllustration: ChampionIllustrationEntry = {
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
    const existingIllustration = existingIllustrationMap.get(task.id)
    const shouldAttemptReuse =
      canReuseIllustrationMetadata(task, existingIllustration, currentVersion) &&
      (await fileExists(outputFile))

    if (shouldAttemptReuse) {
      const existingBytes = await readFile(outputFile)

      if (Buffer.compare(existingBytes, rendered.bytes) === 0) {
        return {
          mode: 'reused' as const,
          item: existingIllustration,
        }
      }
    }

    await writeFile(outputFile, rendered.bytes)

    return {
      mode: 'rendered' as const,
      item: nextIllustration,
    }
  })
  const illustrationMap = new Map<string, ChampionIllustrationEntry>(
    (hasSelectionFilters ? (baseCollection?.items ?? []) : []).map((item) => {
      const entry = item as ChampionIllustrationEntry
      return [entry.id, entry]
    }),
  )

  for (const entry of writtenIllustrations) {
    const illustration = entry.item
    illustrationMap.set(illustration.id, illustration)
  }

  const sortedIllustrations = Array.from(illustrationMap.values()).sort(sortIllustrations)
  await removeUnexpectedFiles(
    path.join(illustrationRoot, 'heroes'),
    new Set(
      sortedIllustrations
        .filter((item) => item.kind === 'hero-base')
        .map((item) => path.basename(item.image.path)),
    ),
  )
  await removeUnexpectedFiles(
    path.join(illustrationRoot, 'skins'),
    new Set(
      sortedIllustrations
        .filter((item) => item.kind === 'skin')
        .map((item) => path.basename(item.image.path)),
    ),
  )
  await writeFile(
    collectionFile,
    `${JSON.stringify(
      { items: sortedIllustrations, updatedAt: animations?.updatedAt ?? visuals.updatedAt },
      null,
      2,
    )}\n`,
  )

  const totalBytes = sortedIllustrations.reduce((sum, item) => sum + item.image.bytes, 0)
  const heroCount = sortedIllustrations.filter((item) => item.kind === 'hero-base').length
  const skinCount = sortedIllustrations.filter((item) => item.kind === 'skin').length
  const renderedCount = writtenIllustrations.filter((entry) => entry.mode === 'rendered').length
  const reusedCount = writtenIllustrations.length - renderedCount

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
    renderedCount,
    reusedCount,
  }
}

function printUsage(): void {
  console.log(`用法：
  node scripts/sync-idle-champions-illustrations.ts [--visualsFile <file>] [--animationsFile <file>] [--outputDir <dir>] [--championIds <ids>] [--skinIds <ids>]

说明：
  统一复用本地 champion-animations 清单中的默认 sequence/frame，把 hero-base / skin 的本地 .bin 渲染为站内静态 PNG；缺少动画包会直接报错，不再回退官方静态图。
`)
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
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

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error: unknown) => {
    console.error(`同步立绘资源失败：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
