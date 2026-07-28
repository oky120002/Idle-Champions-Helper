import { describe, expect, it } from 'vitest'

import { classifyScoringSupport } from './signal-coverage.ts'

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
