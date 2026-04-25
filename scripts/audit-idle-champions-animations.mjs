import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { decodeSkelAnimGraphicBuffer } from './data/skelanim-codec.mjs'
import {
  buildSuspicionLevel,
  buildSuspicionSignals,
  compareAnimationSequenceMetrics,
  listAnimationIdleCandidateMetrics,
  scoreAnimationSequenceMetrics,
  summarizeAnimationSequenceMetrics,
} from './data/champion-animation-idle-selection.mjs'
import {
  DEFAULT_CHAMPION_ANIMATION_IDLE_OVERRIDES_FILE,
  readChampionAnimationIdleOverrides,
} from './data/champion-animation-idle-overrides.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_CURRENT_VERSION = 'v1'
const DEFAULT_ANIMATIONS_FILE = 'champion-animations.json'
const DEFAULT_AUDIT_FILE = 'champion-animation-audit.json'
const MAX_CANDIDATES = 3

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

function buildAnimationFilter(championIds, skinIds) {
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

function buildAuditEntry(animation, scoredMetrics, animationIdleOverride) {
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

function sortAuditEntries(left, right) {
  const suspicionOrder = {
    high: 0,
    medium: 1,
    low: 2,
    none: 3,
  }

  return (
    (suspicionOrder[left.suspicionLevel] ?? 99) - (suspicionOrder[right.suspicionLevel] ?? 99) ||
    right.suspicionScore - left.suspicionScore ||
    left.seat - right.seat ||
    left.championName.display.localeCompare(right.championName.display) ||
    left.illustrationName.display.localeCompare(right.illustrationName.display) ||
    left.id.localeCompare(right.id)
  )
}

export async function auditChampionAnimations(options = {}) {
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
  const animationCollection = await readJson(animationsFile)
  const idleOverrides = await readChampionAnimationIdleOverrides(idleOverridesFile)
  const filterAnimation = buildAnimationFilter(championIds, skinIds)
  const selectedAnimations = animationCollection.items.filter(filterAnimation)
  const baseCollection = hasSelectionFilters ? await readJsonIfExists(auditFile) : null
  const nextEntries = []

  for (const animation of selectedAnimations) {
    const assetFile = resolvePublishedAssetFile(outputDir, currentVersion, animation.asset.path)
    const rawBuffer = await readFile(assetFile)
    const skelAnim = decodeSkelAnimGraphicBuffer(
      {
        graphicId: animation.sourceGraphicId,
        sourceGraphic: animation.sourceGraphic,
        sourceVersion: animation.sourceVersion,
        remotePath: animation.asset.path,
        delivery: 'zlib-png',
      },
      rawBuffer,
    )
    const character = skelAnim.characters[0]

    if (!character) {
      throw new Error(`${animation.id} 缺少可用角色数据`)
    }

    const sequenceSummaryByIndex = new Map(animation.sequences.map((item) => [item.sequenceIndex, item]))
    const rawMetrics = character.sequences.map((sequence) =>
      summarizeAnimationSequenceMetrics(
        sequence,
        sequenceSummaryByIndex.get(sequence.sequenceIndex) ?? null,
      ),
    )
    const scoredMetrics = scoreAnimationSequenceMetrics(rawMetrics)
    nextEntries.push(buildAuditEntry(animation, scoredMetrics, idleOverrides.get(animation.id) ?? null))
  }

  const auditMap = hasSelectionFilters
    ? new Map((baseCollection?.items ?? []).map((item) => [item.id, item]))
    : new Map()

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

function printUsage() {
  console.log(`用法：
  node scripts/audit-idle-champions-animations.mjs [--outputDir <dir>] [--animationsFile <file>] [--idleOverridesFile <file>] [--championIds <ids>] [--skinIds <ids>]

说明：
  读取站内已发布的 champion-animations 清单与 .bin，给每个 hero-base / skin 产出本地 idle 候选审计结果，供人工比对页消费。
`)
}

async function main() {
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`生成动图审计失败：${error.message}`)
    process.exitCode = 1
  })
}
