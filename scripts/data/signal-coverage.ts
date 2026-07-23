import path from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import {
  attachSignalSemantics,
  getRawFilters,
  parsePerHeroExpr,
} from '../../src/domain/abilities/signalSemantics.ts'
import { predicateHasNode } from '../../src/domain/abilities/heroPredicate.ts'
import {
  analyzeBuffUpgradeWrappers,
  collectEffectEntries,
  normalizeEffectSignal,
  shouldIgnoreUnsupportedEffectEntry,
  splitEffectString,
} from './effect-helpers.ts'

const DEFAULT_VERSION_DIR = 'public/data/v1'

interface CounterEntry {
  key: string
  count: number
}

interface CoverageTotals {
  totalHeroes: number
  totalEffectEntries: number
  recognizedSignals: number
  unsupportedSignals: number
  manualSignals: number
  stackedSignals: number
  stackedSignalsWithQualifier: number
  stackedSignalsWithoutQualifier: number
  perHeroExprTotal: number
  parsedPerHeroExprTotal: number
  unparsedPerHeroExprTotal: number
  signalsWithTagTargetQualifier: number
  signalsWithStatTargetQualifier: number
  signalsWithTagCountQualifier: number
  signalsWithStatCountQualifier: number
  signalsWithAgeCountQualifier: number
  buffUpgradeWrapperTotal: number
  buffUpgradeWrapperSupportedBaseResolved: number
  buffUpgradeWrapperSupportedBaseUnresolved: number
  buffUpgradeWrapperFamilyUnsupported: number
}

interface SignalCoverageReport {
  totals: CoverageTotals
  topEffectNames: CounterEntry[]
  topUnsupportedEffectNames: CounterEntry[]
  stackFunctions: CounterEntry[]
  amountFunctions: CounterEntry[]
  amountStackCombos: CounterEntry[]
  scoringSupport: CounterEntry[]
  sourceBuckets: CounterEntry[]
  topRawFilters: CounterEntry[]
  topPerHeroExpr: CounterEntry[]
  topUnparsedPerHeroExpr: CounterEntry[]
  buffUpgradeWrapperStatus: CounterEntry[]
  topBuffUpgradeWrapperKinds: CounterEntry[]
  buffUpgradeWrapperUnresolvedReasons: CounterEntry[]
  topBuffUpgradeMissingBaseEffects: CounterEntry[]
}

type ScoringSupportClassification = 'supported' | 'unsupported-composition' | 'manual'

function incrementCounter(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1)
}

function sortCounter(counter: Map<string, number>, limit: number = Infinity): CounterEntry[] {
  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }))
}

function describeFilter(filter: unknown): string {
  if (!filter || typeof filter !== 'object') {
    return 'unknown-filter'
  }

  const f = filter as Record<string, unknown>

  if ((f.type === 'by_tags' || f.type === 'tags') && typeof f.tags === 'string') {
    return `${f.type}:${f.tags}`
  }

  if (f.type === 'hero_expr' && typeof f.hero_expr === 'string') {
    return `hero_expr:${f.hero_expr}`
  }

  if ((f.type === 'stat' || f.type === 'stat_score') && typeof f.stat === 'string') {
    const operator = typeof f.comparison === 'string'
      ? f.comparison
      : typeof f.check === 'string'
        ? f.check
        : '>='
    const value = typeof f.score === 'number'
      ? f.score
      : typeof f.check === 'number'
        ? f.check
        : '?'
    return `${f.type}:${f.stat.toLowerCase()}${operator}${value}`
  }

  return `type:${typeof f.type === 'string' ? f.type : 'unknown'}`
}

/**
 * 覆盖率报告判定为 supported 的 stackFunc 集合。
 * 必须与 placementFit.ts 的 STACK_COUNT_RESOLVERS keys 保持同步——
 * scorer 新增 stackFunc 支持时，此处不同步会让覆盖率误报 unsupported-composition。
 * 见 tests/unit/planner/scoringSupportSync.test.ts 守护测试。
 */
export const SCORING_SUPPORTED_STACK_FUNCS = new Set<string>([
  'per_crusader',
  'per_tagged_crusader_mult',
  'per_target_crusader',
  'per_hero_attribute',
  'per_upgrade_targets',
  'per_col_behind',
  'per_slot_distance_from_source',
])

function classifyScoringSupport(signal: {
  applyManually?: boolean
  stackFunc?: string | null
  amountFunc?: string | null
}): ScoringSupportClassification {
  if (signal.applyManually) {
    return 'manual'
  }

  if (!signal.stackFunc) {
    return 'supported'
  }

  const amountFunc = signal.amountFunc ?? null
  const supportsAddOrMult = amountFunc === 'add' || amountFunc === 'mult'

  return SCORING_SUPPORTED_STACK_FUNCS.has(signal.stackFunc) && supportsAddOrMult
    ? 'supported'
    : 'unsupported-composition'
}

export function generateSignalCoverageReport(details: unknown[]): SignalCoverageReport {
  const effectNameCounts = new Map<string, number>()
  const unsupportedEffectNameCounts = new Map<string, number>()
  const stackFuncCounts = new Map<string, number>()
  const amountFuncCounts = new Map<string, number>()
  const amountStackComboCounts = new Map<string, number>()
  const rawFilterCounts = new Map<string, number>()
  const perHeroExprCounts = new Map<string, number>()
  const unparsedPerHeroExprCounts = new Map<string, number>()
  const scoreSupportCounts = new Map<string, number>()
  const sourceBucketCounts = new Map<string, number>()
  const buffUpgradeWrapperStatusCounts = new Map<string, number>()
  const buffUpgradeWrapperKindCounts = new Map<string, number>()
  const buffUpgradeWrapperUnresolvedReasonCounts = new Map<string, number>()
  const buffUpgradeMissingBaseEffectCounts = new Map<string, number>()

  let totalHeroes = 0
  let totalEffectEntries = 0
  let recognizedSignals = 0
  let unsupportedSignals = 0
  let stackedSignals = 0
  let stackedSignalsWithQualifier = 0
  let signalsWithTagTargetQualifier = 0
  let signalsWithStatTargetQualifier = 0
  let signalsWithTagCountQualifier = 0
  let signalsWithStatCountQualifier = 0
  let signalsWithAgeCountQualifier = 0
  let manualSignals = 0
  let perHeroExprTotal = 0
  let parsedPerHeroExprTotal = 0
  let buffUpgradeWrapperTotal = 0
  let buffUpgradeWrapperSupportedBaseResolved = 0
  let buffUpgradeWrapperSupportedBaseUnresolved = 0
  let buffUpgradeWrapperFamilyUnsupported = 0

  for (const detail of details) {
    totalHeroes += 1

    for (const wrapperAuditEntry of analyzeBuffUpgradeWrappers(detail)) {
      buffUpgradeWrapperTotal += 1
      incrementCounter(buffUpgradeWrapperStatusCounts, wrapperAuditEntry.status)
      incrementCounter(buffUpgradeWrapperKindCounts, wrapperAuditEntry.wrapperKind)

      if (wrapperAuditEntry.status === 'wrapper-supported-base-resolved') {
        buffUpgradeWrapperSupportedBaseResolved += 1
      } else if (wrapperAuditEntry.status === 'wrapper-supported-base-unresolved') {
        buffUpgradeWrapperSupportedBaseUnresolved += 1
      } else if (wrapperAuditEntry.status === 'wrapper-family-unsupported') {
        buffUpgradeWrapperFamilyUnsupported += 1
      }

      if (wrapperAuditEntry.unresolvedReason) {
        incrementCounter(buffUpgradeWrapperUnresolvedReasonCounts, wrapperAuditEntry.unresolvedReason)
      }

      for (const baseEffectName of wrapperAuditEntry.unresolvedBaseEffectNames) {
        incrementCounter(buffUpgradeMissingBaseEffectCounts, baseEffectName)
      }
    }

    for (const entry of collectEffectEntries(detail)) {
      totalEffectEntries += 1
      incrementCounter(sourceBucketCounts, entry.sourceBucket)

      const split = splitEffectString(entry.effectString)
      if (!split) {
        continue
      }

      incrementCounter(effectNameCounts, split.effectName)

      for (const filter of getRawFilters(entry.effect)) {
        incrementCounter(rawFilterCounts, describeFilter(filter))
      }

      const perHeroExprRaw = entry.effect.per_hero_expr
      const perHeroExpr = typeof perHeroExprRaw === 'string' ? perHeroExprRaw.trim() : null
      if (perHeroExpr) {
        perHeroExprTotal += 1
        incrementCounter(perHeroExprCounts, perHeroExpr)
        if (parsePerHeroExpr(perHeroExpr) === null) {
          incrementCounter(unparsedPerHeroExprCounts, perHeroExpr)
        } else {
          parsedPerHeroExprTotal += 1
        }
      }

      const parsed = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed', entry)
      if (!parsed.ok) {
        if (shouldIgnoreUnsupportedEffectEntry(split.effectName)) {
          continue
        }
        unsupportedSignals += 1
        incrementCounter(unsupportedEffectNameCounts, split.effectName)
        continue
      }

      recognizedSignals += 1
      const signal = attachSignalSemantics(parsed.signal, entry.effect)
      const stackFunc = signal.stackFunc ?? 'none'
      const amountFunc = signal.amountFunc ?? 'none'
      const scoreSupport = classifyScoringSupport(signal)
      incrementCounter(stackFuncCounts, stackFunc)
      incrementCounter(amountFuncCounts, amountFunc)
      incrementCounter(amountStackComboCounts, `${stackFunc}__${amountFunc}`)
      incrementCounter(scoreSupportCounts, scoreSupport)

      if (signal.applyManually) {
        manualSignals += 1
      }

      if (predicateHasNode(signal.targetQualifier?.predicate, 'tag')) {
        signalsWithTagTargetQualifier += 1
      }
      if (predicateHasNode(signal.targetQualifier?.predicate, 'stat')) {
        signalsWithStatTargetQualifier += 1
      }

      if (signal.stackFunc) {
        stackedSignals += 1
        if (signal.formationCountQualifier) {
          stackedSignalsWithQualifier += 1
        }
      }

      if (predicateHasNode(signal.formationCountQualifier?.predicate, 'tag')) {
        signalsWithTagCountQualifier += 1
      }
      if (predicateHasNode(signal.formationCountQualifier?.predicate, 'stat')) {
        signalsWithStatCountQualifier += 1
      }
      if (predicateHasNode(signal.formationCountQualifier?.predicate, 'age')) {
        signalsWithAgeCountQualifier += 1
      }
    }
  }

  return {
    totals: {
      totalHeroes,
      totalEffectEntries,
      recognizedSignals,
      unsupportedSignals,
      manualSignals,
      stackedSignals,
      stackedSignalsWithQualifier,
      stackedSignalsWithoutQualifier: stackedSignals - stackedSignalsWithQualifier,
      perHeroExprTotal,
      parsedPerHeroExprTotal,
      unparsedPerHeroExprTotal: perHeroExprTotal - parsedPerHeroExprTotal,
      signalsWithTagTargetQualifier,
      signalsWithStatTargetQualifier,
      signalsWithTagCountQualifier,
      signalsWithStatCountQualifier,
      signalsWithAgeCountQualifier,
      buffUpgradeWrapperTotal,
      buffUpgradeWrapperSupportedBaseResolved,
      buffUpgradeWrapperSupportedBaseUnresolved,
      buffUpgradeWrapperFamilyUnsupported,
    },
    topEffectNames: sortCounter(effectNameCounts, 20),
    topUnsupportedEffectNames: sortCounter(unsupportedEffectNameCounts, 20),
    stackFunctions: sortCounter(stackFuncCounts, 20),
    amountFunctions: sortCounter(amountFuncCounts, 10),
    amountStackCombos: sortCounter(amountStackComboCounts, 20),
    scoringSupport: sortCounter(scoreSupportCounts, 10),
    sourceBuckets: sortCounter(sourceBucketCounts, 10),
    topRawFilters: sortCounter(rawFilterCounts, 30),
    topPerHeroExpr: sortCounter(perHeroExprCounts, 20),
    topUnparsedPerHeroExpr: sortCounter(unparsedPerHeroExprCounts, 20),
    buffUpgradeWrapperStatus: sortCounter(buffUpgradeWrapperStatusCounts, 10),
    topBuffUpgradeWrapperKinds: sortCounter(buffUpgradeWrapperKindCounts, 20),
    buffUpgradeWrapperUnresolvedReasons: sortCounter(buffUpgradeWrapperUnresolvedReasonCounts, 10),
    topBuffUpgradeMissingBaseEffects: sortCounter(buffUpgradeMissingBaseEffectCounts, 20),
  }
}

export async function loadChampionDetails(versionDir: string = DEFAULT_VERSION_DIR): Promise<unknown[]> {
  const detailDir = path.resolve(versionDir, 'champion-details')
  const filenames = (await readdir(detailDir))
    .filter((name) => name.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))

  return Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(detailDir, filename)
      return JSON.parse(await readFile(filePath, 'utf8')) as unknown
    }),
  )
}

export async function generateSignalCoverageFromVersionDir(
  versionDir: string = DEFAULT_VERSION_DIR,
): Promise<SignalCoverageReport> {
  const details = await loadChampionDetails(versionDir)
  return generateSignalCoverageReport(details)
}

async function main(): Promise<void> {
  const versionDir = process.argv[2] ?? DEFAULT_VERSION_DIR
  const report = await generateSignalCoverageFromVersionDir(versionDir)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

const currentFilePath = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  await main()
}
