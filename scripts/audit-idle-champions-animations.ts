import process from 'node:process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import type { LocalizedText } from '../src/domain/types/common.ts'
import { readJson, readJsonIfExists } from './data/io-utils.ts'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.ts'
import {
  buildSuspicionLevel,
  buildSuspicionSignals,
  compareAnimationSequenceMetrics,
  listAnimationIdleCandidateMetrics,
  scoreAnimationSequenceMetrics,
  summarizeAnimationSequenceMetrics,
} from './data/champion-animation-idle-selection.ts'
import {
  DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
  readChampionAnimationIdleOverrides,
} from './data/champion-animation-idle-overrides.ts'
import type { ChampionAnimationIdleOverride } from './data/champion-animation-idle-overrides.ts'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_ANIMATIONS_FILE = 'champion-animations.json'
const DEFAULT_AUDIT_FILE = 'champion-animation-audit.json'
const MAX_CANDIDATES = 3

// 派生自家函数签名/返回类型；champion-animation-idle-selection 的内部 interface 未导出，
// 用 Parameters/ReturnType 跟随上游形状，避免重复声明。
type ScoredAnimationMetrics = ReturnType<typeof scoreAnimationSequenceMetrics>[number]
type AnimationSequenceSummary = NonNullable<Parameters<typeof summarizeAnimationSequenceMetrics>[1]>
type SuspicionSignal = ReturnType<typeof buildSuspicionSignals>[number]
type SuspicionLevel = ReturnType<typeof buildSuspicionLevel>

interface AnimationAsset {
  path: string
  bytes?: number
  format?: string | undefined
}

interface AnimationItem {
  id: string
  championId: string
  skinId: string | null
  kind: string
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  defaultSequenceIndex: number
  defaultFrameIndex: number
  asset: AnimationAsset
  sequences: AnimationSequenceSummary[]
}

interface AnimationCollection {
  items: AnimationItem[]
  updatedAt: string
}

interface AuditEntry {
  id: string
  championId: string
  skinId: string | null
  kind: string
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  currentSequenceIndex: number
  currentFrameIndex: number
  sequenceCount: number
  suspicionLevel: SuspicionLevel
  suspicionScore: number
  suspicionSignals: SuspicionSignal[]
  current: ScoredAnimationMetrics
  recommended: ScoredAnimationMetrics
  candidates: ScoredAnimationMetrics[]
}

interface AuditChampionAnimationsOptions {
  outputDir?: string | undefined
  currentVersion?: string | undefined
  animationsFile?: string | undefined
  auditFile?: string | undefined
  idleOverridesFile?: string | undefined
  championIds?: string | undefined
  skinIds?: string | undefined
}

interface AuditChampionAnimationsResult {
  outputDir: string
  animationsFile: string
  auditFile: string
  count: number
  reviewedCount: number
  highCount: number
  mediumCount: number
  lowCount: number
}

function parseIdFilter(rawValue: string | undefined | null): Set<string> | null {
  if (!rawValue) {
    return null
  }

  const ids = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return ids.length > 0 ? new Set(ids) : null
}

function buildAnimationFilter(
  championIds: Set<string> | null,
  skinIds: Set<string> | null,
): (animation: AnimationItem) => boolean {
  return (animation) => {
    if (!championIds && !skinIds) {
      return true
    }

    if (championIds?.has(animation.championId)) {
      return true
    }

    if (animation.kind === 'skin' && animation.skinId && skinIds?.has(animation.skinId)) {
      return true
    }

    return false
  }
}

function resolvePublishedAssetFile(
  outputDir: string,
  currentVersion: string,
  assetPath: string | undefined,
): string {
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

function buildAuditEntry(
  animation: AnimationItem,
  scoredMetrics: ScoredAnimationMetrics[],
  animationIdleOverride: ChampionAnimationIdleOverride | undefined,
): AuditEntry {
  const sortedMetrics = [...scoredMetrics].sort(compareAnimationSequenceMetrics)
  const currentMetrics =
    scoredMetrics.find((item) => item.sequenceIndex === animation.defaultSequenceIndex) ?? sortedMetrics[0]

  if (!currentMetrics) {
    throw new Error(`${animation.id} 缺少可用 sequence metrics`)
  }

  const candidateMetrics = listAnimationIdleCandidateMetrics({
    scoredMetrics,
    currentSequenceIndex: currentMetrics.sequenceIndex,
    blockedSequenceIndexes: animationIdleOverride?.blockedSequenceIndexes ?? [],
    fixedSequenceIndex: animationIdleOverride?.fixedSequenceIndex ?? null,
    maxCandidates: MAX_CANDIDATES,
  })
  const recommendedMetrics = candidateMetrics[0] ?? currentMetrics
  const suspicionSignals = buildSuspicionSignals(currentMetrics, recommendedMetrics)
  const suspicionLevel = buildSuspicionLevel(currentMetrics, recommendedMetrics, suspicionSignals)
  const suspicionScore = Number(Math.max(0, recommendedMetrics.score - currentMetrics.score).toFixed(6))

  return {
    id: animation.id,
    championId: animation.championId,
    skinId: animation.skinId,
    kind: animation.kind,
    seat: animation.seat,
    championName: animation.championName,
    illustrationName: animation.illustrationName,
    currentSequenceIndex: animation.defaultSequenceIndex,
    currentFrameIndex: animation.defaultFrameIndex,
    sequenceCount: scoredMetrics.length,
    suspicionLevel,
    suspicionScore,
    suspicionSignals,
    current: currentMetrics,
    recommended: recommendedMetrics,
    candidates: candidateMetrics,
  }
}

const SUSPICION_ORDER: Record<SuspicionLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
}

function sortAuditEntries(left: AuditEntry, right: AuditEntry): number {
  return (
    SUSPICION_ORDER[left.suspicionLevel] - SUSPICION_ORDER[right.suspicionLevel] ||
    right.suspicionScore - left.suspicionScore ||
    left.seat - right.seat ||
    left.championName.display.localeCompare(right.championName.display) ||
    left.illustrationName.display.localeCompare(right.illustrationName.display) ||
    left.id.localeCompare(right.id)
  )
}

export async function auditChampionAnimations(
  options: AuditChampionAnimationsOptions = {},
): Promise<AuditChampionAnimationsResult> {
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const animationsFile = path.resolve(options.animationsFile ?? path.join(outputDir, DEFAULT_ANIMATIONS_FILE))
  const auditFile = path.resolve(options.auditFile ?? path.join(outputDir, DEFAULT_AUDIT_FILE))
  const idleOverridesFile = path.resolve(
    options.idleOverridesFile ?? DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
  )
  const championIds = parseIdFilter(options.championIds ?? null)
  const skinIds = parseIdFilter(options.skinIds ?? null)
  const hasSelectionFilters = Boolean(championIds || skinIds)
  const animationCollection = (await readJson(animationsFile)) as AnimationCollection
  const idleOverrides = await readChampionAnimationIdleOverrides(idleOverridesFile)
  const filterAnimation = buildAnimationFilter(championIds, skinIds)
  const selectedAnimations = animationCollection.items.filter(filterAnimation)
  const baseCollection = hasSelectionFilters
    ? ((await readJsonIfExists(auditFile)) as { items?: AuditEntry[]; updatedAt?: string } | null)
    : null
  const nextEntries: AuditEntry[] = []

  for (const animation of selectedAnimations) {
    const assetFile = resolvePublishedAssetFile(outputDir, currentVersion, animation.asset.path)
    const rawBuffer = await readFile(assetFile)
    const skelAnim = decodeSkelAnimGraphicBuffer(
      // decodeSkelAnimGraphicBuffer 只读 delivery；其余字段未使用，TS strict 下省略。
      { delivery: 'zlib-png' },
      rawBuffer,
    )
    const character = skelAnim.characters[0]

    if (!character) {
      throw new Error(`${animation.id} 缺少可用角色数据`)
    }

    const sequenceSummaryByIndex = new Map(
      animation.sequences.map((item) => [item.sequenceIndex, item]),
    )
    const rawMetrics = character.sequences.map((sequence) =>
      summarizeAnimationSequenceMetrics(
        sequence,
        sequenceSummaryByIndex.get(sequence.sequenceIndex) ?? null,
      ),
    )
    const scoredMetrics = scoreAnimationSequenceMetrics(rawMetrics)
    nextEntries.push(buildAuditEntry(animation, scoredMetrics, idleOverrides.get(animation.id) ?? undefined))
  }

  const auditMap = hasSelectionFilters
    ? new Map((baseCollection?.items ?? []).map((item) => [item.id, item]))
    : new Map<string, AuditEntry>()

  for (const entry of nextEntries) {
    auditMap.set(entry.id, entry)
  }

  const items = Array.from(auditMap.values()).sort(sortAuditEntries)
  await writeFile(
    auditFile,
    `${JSON.stringify({ items, updatedAt: animationCollection.updatedAt }, null, 2)}\n`,
    'utf8',
  )

  return {
    outputDir,
    animationsFile,
    auditFile,
    count: items.length,
    reviewedCount: items.filter((item) => item.suspicionLevel !== 'none').length,
    highCount: items.filter((item) => item.suspicionLevel === 'high').length,
    mediumCount: items.filter((item) => item.suspicionLevel === 'medium').length,
    lowCount: items.filter((item) => item.suspicionLevel === 'low').length,
  }
}

function printUsage(): void {
  console.log(`用法：
  node scripts/audit-idle-champions-animations.ts [--outputDir <dir>] [--animationsFile <file>] [--idleOverridesFile <file>] [--championIds <ids>] [--skinIds <ids>]

说明：
  读取站内已发布的 champion-animations 清单与 .bin，给每个 hero-base / skin 产出本地 idle 候选审计结果，供人工比对页消费。
`)
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      outputDir: { type: 'string' },
      currentVersion: { type: 'string' },
      animationsFile: { type: 'string' },
      auditFile: { type: 'string' },
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

  const result = await auditChampionAnimations(values)
  console.log('动图审计完成：')
  console.log(`- audit file: ${result.auditFile}`)
  console.log(`- total entries: ${result.count}`)
  console.log(`- review entries: ${result.reviewedCount}`)
  console.log(`- high: ${result.highCount}`)
  console.log(`- medium: ${result.mediumCount}`)
  console.log(`- low: ${result.lowCount}`)
}

const entryPoint = process.argv[1]
if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch((error: unknown) => {
    console.error(`生成动图审计失败：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
