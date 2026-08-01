import { describe, expect, it } from 'vitest'

import {
  classifyScoringSupport,
  diffCoverageBaseline,
  extractCoverageBaseline,
  generateSignalCoverageReport,
} from './signal-coverage.ts'

// classifyScoringSupport 必须与 placementFit.resolveSignalMultiplier 的计分判定对称——
// 分类器说 supported 的，scorer 必须真计分；说 unsupported-composition 的，scorer 必须真不计分。
// 否则覆盖率报告失真，误导后续支持扩展。

describe('classifyScoringSupport', () => {
  it('applyManually → manual（scorer 跳过手动触发）', () => {
    expect(classifyScoringSupport({ applyManually: true, stackFunc: 'per_hero', amountFunc: 'mult' })).toBe('manual')
  })

  it('stacksMultiply=true 先短路 → supported，即使 stackFunc 不在白名单（与 scorer 短路一致）', () => {
    // 回归：placementFit.resolveSignalMultiplier 对 stacksMultiply===true 先短路计分（manualStackCount），
    // 忽略 stackFunc。分类器须对称——否则 per_mithral_hall_stacks / get_stat 等 stacksMultiply
    // 叠未白名单 stackFunc 的 signal 被误报 unsupported-composition（实际已计分）。
    expect(classifyScoringSupport({ stacksMultiply: true, stackFunc: 'per_mithral_hall_stacks', amountFunc: 'mult' })).toBe('supported')
    expect(classifyScoringSupport({ stacksMultiply: true, stackFunc: 'get_stat', amountFunc: 'mult' })).toBe('supported')
    expect(classifyScoringSupport({ stacksMultiply: true, stackFunc: null, amountFunc: null })).toBe('supported')
  })

  it('无 stackFunc 的普通 signal → supported（scorer applySignalPercent 计分）', () => {
    expect(classifyScoringSupport({ stackFunc: null, amountFunc: null })).toBe('supported')
    expect(classifyScoringSupport({})).toBe('supported')
  })

  it('白名单 stackFunc + add/mult → supported（与 scorer STACK_COUNT_RESOLVERS 一致）', () => {
    expect(classifyScoringSupport({ stackFunc: 'per_hero', amountFunc: 'mult' })).toBe('supported')
    expect(classifyScoringSupport({ stackFunc: 'per_crusader', amountFunc: 'add' })).toBe('supported')
    expect(classifyScoringSupport({ stackFunc: 'per_upgrade_targets', amountFunc: 'add' })).toBe('supported')
    expect(classifyScoringSupport({ stackFunc: 'per_col_behind', amountFunc: 'mult' })).toBe('supported')
  })

  it('未支持 stackFunc → unsupported-composition（scorer 无 resolver 不计分）', () => {
    expect(classifyScoringSupport({ stackFunc: 'per_mithral_hall_stacks', amountFunc: 'mult' })).toBe('unsupported-composition')
    expect(classifyScoringSupport({ stackFunc: 'get_stat', amountFunc: 'mult' })).toBe('unsupported-composition')
  })

  it('白名单 stackFunc 但 amountFunc 非 add/mult → unsupported-composition（scorer 无法判定叠层方式）', () => {
    expect(classifyScoringSupport({ stackFunc: 'per_hero', amountFunc: null })).toBe('unsupported-composition')
    expect(classifyScoringSupport({ stackFunc: 'per_hero', amountFunc: 'unknown' })).toBe('unsupported-composition')
  })
})

describe('coverage baseline gate', () => {
  // 基线 gate 守 signal-coverage 不静默回退：真实数据跑出的关键计数须与提交基线一致，
  // 漂移（新 effect kind 变 unsupported、识别率变化、数据同步带来新英雄）须 --update-baseline 显式确认。
  function buildReport(overrides: {
    totalHeroes?: number
    recognizedSignals?: number
    unsupportedSignals?: number
    supported?: number
    unsupportedComposition?: number
    wrapperFamilyUnsupported?: number
  }) {
    const report = generateSignalCoverageReport([])
    report.totals.totalHeroes = overrides.totalHeroes ?? 0
    report.totals.recognizedSignals = overrides.recognizedSignals ?? 0
    report.totals.unsupportedSignals = overrides.unsupportedSignals ?? 0
    report.scoringSupport = [
      { key: 'supported', count: overrides.supported ?? 0 },
      { key: 'unsupported-composition', count: overrides.unsupportedComposition ?? 0 },
    ]
    if (overrides.wrapperFamilyUnsupported) {
      report.buffUpgradeWrapperStatus = [
        { key: 'wrapper-family-unsupported', count: overrides.wrapperFamilyUnsupported },
      ]
    }
    return report
  }

  it('extractCoverageBaseline 抽取 totals + scoringSupport + buffUpgrade 关键计数为扁平记录', () => {
    const baseline = extractCoverageBaseline(buildReport({
      totalHeroes: 164,
      recognizedSignals: 11717,
      unsupportedSignals: 2418,
      supported: 11664,
      unsupportedComposition: 19,
      wrapperFamilyUnsupported: 11,
    }))
    expect(baseline.totalHeroes).toBe(164)
    expect(baseline.recognizedSignals).toBe(11717)
    expect(baseline.unsupportedSignals).toBe(2418)
    expect(baseline['scoringSupport.supported']).toBe(11664)
    expect(baseline['scoringSupport.unsupported-composition']).toBe(19)
    expect(baseline['buffUpgrade.wrapper-family-unsupported']).toBe(11)
  })

  it('diffCoverageBaseline 一致 → null', () => {
    const baseline = extractCoverageBaseline(buildReport({ totalHeroes: 5, unsupportedSignals: 3 }))
    expect(diffCoverageBaseline(baseline, { ...baseline })).toBeNull()
  })

  it('diffCoverageBaseline 漂移 → 描述每个变化键（旧→新 + delta），回归与改善都触发', () => {
    const expected = extractCoverageBaseline(buildReport({ unsupportedSignals: 15, recognizedSignals: 80 }))
    const actual = { ...expected, unsupportedSignals: 18, recognizedSignals: 77 }
    const diff = diffCoverageBaseline(expected, actual)
    expect(diff).toMatch(/unsupportedSignals: 15 → 18 \(\+3\)/)
    expect(diff).toMatch(/recognizedSignals: 80 → 77 \(-3\)/)
  })

  it('diffCoverageBaseline 缺失键 → 标记 (missing)', () => {
    expect(diffCoverageBaseline({ foo: 5 }, {})).toMatch(/foo: 5 → \(missing\)/)
  })
})
