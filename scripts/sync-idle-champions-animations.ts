import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import type { LocalizedText } from '../src/domain/types/common.ts'
import { createChampionGraphicResourceCache } from './data/champion-graphic-resource-cache.ts'
import type { ChampionGraphicResourceCache } from './data/champion-graphic-resource-cache.ts'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.ts'
import {
  resolvePreferredSequenceIndexes,
  scoreAnimationSequenceMetrics,
  selectAnimationIdleDefaultMetrics,
  summarizeAnimationSequence,
  summarizeAnimationSequenceMetrics,
} from './data/champion-animation-idle-selection.ts'
import {
  DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
  readChampionAnimationIdleOverrides,
} from './data/champion-animation-idle-overrides.ts'
import type { ChampionAnimationIdleOverride } from './data/champion-animation-idle-overrides.ts'
import {
  fileExists,
  readExistingCollection,
  shouldSkipResourceSync,
} from './data/resource-sync-policy.ts'
import {
  parseIdFilter,
  readJson,
  runWithConcurrency,
} from './data/io-utils.ts'
import type { RemoteGraphicAsset } from './data/champion-asset-helpers.ts'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_VISUALS_FILE = 'champion-visuals.json'
const DEFAULT_CONCURRENCY = 6
const DEFAULT_FPS = 24
const CHAMPION_ANIMATION_DIR_NAME = 'champion-animations'

// 派生自家函数返回类型，避免重复声明 metrics/summary 结构（champion-animation-idle-selection
// 的内部 interface 未导出，用 ReturnType 跟随上游形状）。
type AnimationSequenceSummary = ReturnType<typeof summarizeAnimationSequence>
type SelectedAnimationMetrics = NonNullable<ReturnType<typeof selectAnimationIdleDefaultMetrics>>

interface AnimationAsset {
  path: string
  bytes: number
  format: 'skelanim-zlib'
}

interface AnimationItem {
  id: string
  championId: string
  skinId: string | null
  kind: 'hero-base' | 'skin'
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  sourceSlot: string
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  fps: number
  defaultSequenceIndex: number
  defaultFrameIndex: number
  asset: AnimationAsset
  sequences: AnimationSequenceSummary[]
}

// 既有清单条目，允许 asset/sourceVersion 等字段缺省以兼容历史写入。
interface ExistingAnimation {
  id: string
  kind: string
  championId: string
  skinId: string | null
  sourceSlot: string
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  fps: number
  asset: { path?: string; bytes?: number; format?: string } | null
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
  base?: RemoteGraphicAsset | null
  skins?: SkinVisualEntry[]
}

interface SkinVisualEntry {
  id: string
  name: LocalizedText
  xl?: RemoteGraphicAsset | null
  large?: RemoteGraphicAsset | null
  base?: RemoteGraphicAsset | null
}

type GraphicDefMap = Map<string, Record<string, unknown>>

type AnimationKind = 'hero-base' | 'skin'

interface AnimationTask {
  id: string
  championId: string
  skinId: string | null
  kind: AnimationKind
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  outputGroup: 'heroes' | 'skins'
  outputId: string
  sourceSlot: string
  asset: RemoteGraphicAsset
  graphicDefinition: Record<string, unknown> | null
}

interface SyncChampionAnimationsOptions {
  outputDir?: string | undefined
  currentVersion?: string | undefined
  visualsFile?: string | undefined
  input?: string | undefined
  idleOverridesFile?: string | undefined
  concurrency?: string | undefined
  championIds?: string | undefined
  skinIds?: string | undefined
}

interface SyncChampionAnimationsResult {
  outputDir: string
  visualsFile: string
  currentVersion: string
  totalBytes: number
  count: number
  heroCount: number
  skinCount: number
  downloadedCount: number
  reusedCount: number
  skipped?: boolean
}

function buildAnimationAssetPath(currentVersion: string, group: string, id: string): string {
  return `${currentVersion}/${CHAMPION_ANIMATION_DIR_NAME}/${group}/${id}.bin`
}

function isSkelAnimGraphicDefinition(graphicDefinition: Record<string, unknown> | undefined): boolean {
  return Number(graphicDefinition?.type) === 3
}

function isSkelAnimAsset(asset: RemoteGraphicAsset, graphicDefById: GraphicDefMap): boolean {
  const graphicDefinition = graphicDefById.get(String(asset.graphicId))
  return isSkelAnimGraphicDefinition(graphicDefinition) || asset.remotePath.includes('/Characters/')
}

function sortAnimations(left: AnimationItem, right: AnimationItem): number {
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

function buildHeroAnimationTasks(
  visuals: ChampionVisualsCollection,
  graphicDefById: GraphicDefMap,
): AnimationTask[] {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? undefined)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? undefined)
  const tasks: AnimationTask[] = []

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

function buildSkinAnimationTasks(
  visuals: ChampionVisualsCollection,
  graphicDefById: GraphicDefMap,
): AnimationTask[] {
  const championIdFilter = parseIdFilter(visuals.filters?.championIds ?? undefined)
  const skinIdFilter = parseIdFilter(visuals.filters?.skinIds ?? undefined)
  const tasks: AnimationTask[] = []

  for (const visual of visuals.items ?? []) {
    if (championIdFilter && !championIdFilter.has(visual.championId)) {
      continue
    }

    for (const skin of visual.skins ?? []) {
      if (skinIdFilter && !skinIdFilter.has(skin.id)) {
        continue
      }

      const candidates: ReadonlyArray<readonly [string, RemoteGraphicAsset | null | undefined]> = [
        ['xl', skin.xl],
        ['large', skin.large],
        ['base', skin.base],
      ]
      const selected = candidates.find(([, asset]) => {
        if (!asset) {
          return false
        }

        return isSkelAnimAsset(asset, graphicDefById)
      })

      if (!selected) {
        continue
      }

      const [slot, asset] = selected
      if (!asset) {
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

function canReuseExistingAnimation(
  task: AnimationTask,
  existingAnimation: ExistingAnimation | undefined,
  currentVersion: string,
): boolean {
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

function decodeAnimationGraphic(task: AnimationTask, rawBuffer: Buffer) {
  // decodeSkelAnimGraphicBuffer 只读 delivery；其余字段未使用，TS strict 下省略。
  return decodeSkelAnimGraphicBuffer(task.asset, rawBuffer)
}

function selectDefaultSequenceForTask(
  task: AnimationTask,
  character: { sequences: ReadonlyArray<Parameters<typeof summarizeAnimationSequenceMetrics>[0]> },
  animationIdleOverride: ChampionAnimationIdleOverride | undefined,
): { selectedMetrics: SelectedAnimationMetrics; sequenceSummaries: AnimationSequenceSummary[] } {
  const preferredSequenceIndexes = resolvePreferredSequenceIndexes(task.graphicDefinition ?? {})
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

async function cleanupAnimationDir(dirPath: string, expectedFiles: Set<string>): Promise<void> {
  await mkdir(dirPath, { recursive: true })

  for (const fileName of await readdir(dirPath)) {
    if (expectedFiles.has(fileName)) {
      continue
    }

    await unlink(path.join(dirPath, fileName))
  }
}

export async function syncChampionAnimations(
  options: SyncChampionAnimationsOptions = {},
): Promise<SyncChampionAnimationsResult> {
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const visualsFile = path.resolve(options.visualsFile ?? path.join(outputDir, DEFAULT_VISUALS_FILE))
  const definitionsInput = options.input ? path.resolve(options.input) : null
  const idleOverridesFile = path.resolve(
    options.idleOverridesFile ?? DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
  )
  const concurrency = Math.max(1, Number(options.concurrency ?? DEFAULT_CONCURRENCY))
  const championIdFilter = parseIdFilter(options.championIds ?? undefined)
  const skinIdFilter = parseIdFilter(options.skinIds ?? undefined)
  const hasSelectionFilters = Boolean(championIdFilter || skinIdFilter)
  const visuals = (await readJson(visualsFile)) as ChampionVisualsCollection
  const definitions = definitionsInput ? await readJson(definitionsInput) : null
  const rawGraphicDefines =
    (definitions as { graphic_defines?: unknown[] } | null)?.graphic_defines ?? []
  const graphicDefById: GraphicDefMap = new Map(
    rawGraphicDefines.map((item) => [
      String((item as Record<string, unknown>).id),
      item as Record<string, unknown>,
    ]),
  )
  const filteredVisuals: ChampionVisualsCollection = {
    ...visuals,
    filters: {
      championIds: options.championIds ?? null,
      skinIds: options.skinIds ?? null,
    },
  }
  const graphicCache: ChampionGraphicResourceCache = createChampionGraphicResourceCache()
  const animationRoot = path.join(outputDir, CHAMPION_ANIMATION_DIR_NAME)
  const collectionFile = path.join(outputDir, 'champion-animations.json')
  const tasks = [
    ...buildHeroAnimationTasks(filteredVisuals, graphicDefById),
    ...buildSkinAnimationTasks(filteredVisuals, graphicDefById),
  ]
  const baseCollection = await readExistingCollection(collectionFile)
  const existingItems = (baseCollection?.items ?? []) as ExistingAnimation[]
  const existingAnimationMap = new Map(existingItems.map((item) => [item.id, item]))
  const idleOverrides = await readChampionAnimationIdleOverrides(idleOverridesFile)

  if (
    !hasSelectionFilters &&
    shouldSkipResourceSync({
      existingUpdatedAt: baseCollection?.updatedAt,
      nextUpdatedAt: visuals.updatedAt,
    })
  ) {
    return {
      outputDir,
      visualsFile,
      currentVersion,
      totalBytes: existingItems.reduce((sum, item) => sum + (item.asset?.bytes ?? 0), 0),
      count: existingItems.length,
      heroCount: existingItems.filter((item) => item.kind === 'hero-base').length,
      skinCount: existingItems.filter((item) => item.kind === 'skin').length,
      downloadedCount: 0,
      reusedCount: existingItems.length,
      skipped: true,
    }
  }

  await mkdir(path.join(animationRoot, 'heroes'), { recursive: true })
  await mkdir(path.join(animationRoot, 'skins'), { recursive: true })

  const writtenAnimations = await runWithConcurrency(tasks, concurrency, async (task) => {
    const outputFile = path.join(animationRoot, task.outputGroup, `${task.outputId}.bin`)
    const existingAnimation = existingAnimationMap.get(task.id)
    const canReuse =
      canReuseExistingAnimation(task, existingAnimation, currentVersion) && (await fileExists(outputFile))
    const rawBuffer = canReuse ? await readFile(outputFile) : await graphicCache.readRawGraphicBuffer(task.asset)
    const decoded = decodeAnimationGraphic(task, rawBuffer)
    const character = decoded.characters[0]

    if (!character) {
      throw new Error(`${task.id} 缺少可用角色数据`)
    }

    const { selectedMetrics, sequenceSummaries } = selectDefaultSequenceForTask(
      task,
      character,
      idleOverrides.get(task.id) ?? undefined,
    )

    if (!canReuse) {
      await writeFile(outputFile, rawBuffer)
    }

    const item: AnimationItem = {
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
    }

    return {
      mode: canReuse ? 'reused' : 'downloaded' as const,
      item,
    }
  })
  const downloadedCount = writtenAnimations.filter((entry) => entry.mode === 'downloaded').length
  const reusedCount = writtenAnimations.length - downloadedCount
  const nextAnimations: AnimationItem[] = writtenAnimations.map((entry) => entry.item)
  const animationMap = hasSelectionFilters
    ? new Map(existingItems.map((item) => [item.id, item as AnimationItem]))
    : new Map<string, AnimationItem>()

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

function printUsage(): void {
  console.log(`用法：
  node scripts/sync-idle-champions-animations.ts [--input <definitions.json>] [--visualsFile <file>] [--outputDir <dir>] [--idleOverridesFile <file>] [--championIds <ids>] [--skinIds <ids>]

说明：
  基于 champion-visuals.json 选择可播放的 hero-base / skin SkelAnim 原始资源，输出供前端 canvas 动画播放和静态默认帧渲染复用的本地二进制资源与索引清单。
`)
}

async function main(): Promise<void> {
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

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error: unknown) => {
    console.error(`同步动画资源失败：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
