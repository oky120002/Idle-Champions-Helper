import path from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import {
  attachPlannerSignalSemantics,
  normalizePlannerStatQualifiers,
  normalizePlannerTargetQualifier,
  parsePlannerPerHeroExpr,
} from '../../src/domain/planner/plannerSignalSemantics.js'
import {
  collectPlannerEffectEntries,
  normalizePlannerEffectSignal,
  splitPlannerEffectString,
} from './planner-effect-helpers.mjs'

const DEFAULT_VERSION_DIR = 'public/data/v1'

function incrementCounter(counter, key) {
  counter.set(key, (counter.get(key) ?? 0) + 1)
}

function sortCounter(counter, limit = Infinity) {
  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }))
}

function describeFilter(filter) {
  if (!filter || typeof filter !== 'object') {
    return 'unknown-filter'
  }

  if ((filter.type === 'by_tags' || filter.type === 'tags') && typeof filter.tags === 'string') {
    return `${filter.type}:${filter.tags}`
  }

  if ((filter.type === 'stat' || filter.type === 'stat_score') && typeof filter.stat === 'string') {
    const operator = typeof filter.comparison === 'string'
      ? filter.comparison
      : typeof filter.check === 'string'
        ? filter.check
        : '>='
    const value = typeof filter.score === 'number'
      ? filter.score
      : typeof filter.check === 'number'
        ? filter.check
        : '?'
    return `${filter.type}:${filter.stat.toLowerCase()}${operator}${value}`
  }

  return `type:${typeof filter.type === 'string' ? filter.type : 'unknown'}`
}

function getRawFilters(effect) {
  return [
    ...(Array.isArray(effect?.filter_targets) ? effect.filter_targets : []),
    ...(Array.isArray(effect?.target_filters) ? effect.target_filters : []),
  ]
}

function classifyScoringSupport(signal) {
  if (signal.applyManually) {
    return 'manual'
  }

  if (!signal.stackFunc) {
    return 'supported'
  }

  const amountFunc = signal.amountFunc ?? null
  const supportsAddOrMult = amountFunc === 'add' || amountFunc === 'mult'
  const supportedStackFunc = (
    signal.stackFunc === 'per_crusader'
    || signal.stackFunc === 'per_tagged_crusader_mult'
    || signal.stackFunc === 'per_hero_attribute'
  )

  return supportedStackFunc && supportsAddOrMult ? 'supported' : 'unsupported-composition'
}

export function generatePlannerSignalCoverageReport(details) {
  const effectNameCounts = new Map()
  const unsupportedEffectNameCounts = new Map()
  const stackFuncCounts = new Map()
  const amountFuncCounts = new Map()
  const amountStackComboCounts = new Map()
  const rawFilterCounts = new Map()
  const perHeroExprCounts = new Map()
  const unparsedPerHeroExprCounts = new Map()
  const scoreSupportCounts = new Map()
  const sourceBucketCounts = new Map()

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

  for (const detail of details) {
    totalHeroes += 1

    for (const entry of collectPlannerEffectEntries(detail)) {
      totalEffectEntries += 1
      incrementCounter(sourceBucketCounts, entry.sourceBucket)

      const split = splitPlannerEffectString(entry.effectString)
      if (!split) {
        continue
      }

      incrementCounter(effectNameCounts, split.effectName)

      for (const filter of getRawFilters(entry.effect)) {
        incrementCounter(rawFilterCounts, describeFilter(filter))
      }

      const perHeroExpr = typeof entry.effect?.per_hero_expr === 'string'
        ? entry.effect.per_hero_expr.trim()
        : null
      if (perHeroExpr) {
        perHeroExprTotal += 1
        incrementCounter(perHeroExprCounts, perHeroExpr)
        if (parsePlannerPerHeroExpr(perHeroExpr) === null) {
          incrementCounter(unparsedPerHeroExprCounts, perHeroExpr)
        } else {
          parsedPerHeroExprTotal += 1
        }
      }

      const parsed = normalizePlannerEffectSignal(split.effectName, split.effectValue, 'official-parsed')
      if (!parsed.ok) {
        unsupportedSignals += 1
        incrementCounter(unsupportedEffectNameCounts, split.effectName)
        continue
      }

      recognizedSignals += 1
      const signal = attachPlannerSignalSemantics(parsed.signal, entry.effect)
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

      if (signal.targetQualifier?.requiredTags?.length) {
        signalsWithTagTargetQualifier += 1
      }
      if (signal.targetQualifier?.requiredStats?.length) {
        signalsWithStatTargetQualifier += 1
      }

      if (signal.stackFunc) {
        stackedSignals += 1
        if (signal.formationCountQualifier) {
          stackedSignalsWithQualifier += 1
        }
      }

      if (signal.formationCountQualifier?.requiredTags?.length) {
        signalsWithTagCountQualifier += 1
      }
      if (signal.formationCountQualifier?.requiredStats?.length) {
        signalsWithStatCountQualifier += 1
      }
      if (
        signal.formationCountQualifier?.minAge !== undefined
        || signal.formationCountQualifier?.maxAge !== undefined
      ) {
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
  }
}

export async function loadPlannerChampionDetails(versionDir = DEFAULT_VERSION_DIR) {
  const detailDir = path.resolve(versionDir, 'champion-details')
  const filenames = (await readdir(detailDir))
    .filter((name) => name.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))

  return Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(detailDir, filename)
      return JSON.parse(await readFile(filePath, 'utf8'))
    }),
  )
}

export async function generatePlannerSignalCoverageFromVersionDir(versionDir = DEFAULT_VERSION_DIR) {
  const details = await loadPlannerChampionDetails(versionDir)
  return generatePlannerSignalCoverageReport(details)
}

async function main() {
  const versionDir = process.argv[2] ?? DEFAULT_VERSION_DIR
  const report = await generatePlannerSignalCoverageFromVersionDir(versionDir)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

const currentFilePath = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  await main()
}
