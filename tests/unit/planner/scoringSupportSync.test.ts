import { describe, expect, it } from 'vitest'

import { STACK_COUNT_RESOLVERS } from '../../../src/domain/planner/placementFit'
import { SCORING_SUPPORTED_STACK_FUNCS } from '../../../scripts/data/signal-coverage.mjs'

describe('scoring support 同步守护', () => {
  it('signal-coverage 的 supported stackFunc 集与 placementFit scorer 的 resolver keys 完全一致', () => {
    // 根因守护：第三轮审计发现 classifyScoringSupport 漏列 per_target_crusader/per_col_behind，
    // 导致覆盖率误报 unsupported-composition。两份白名单必须同步——任一侧新增 stackFunc
    // 支持时，此测试失败，强制同步。
    const scorerKeys = new Set(Object.keys(STACK_COUNT_RESOLVERS))
    expect([...scorerKeys].sort()).toEqual([...SCORING_SUPPORTED_STACK_FUNCS].sort())
  })
})
