import { describe, expect, it } from 'vitest'

import { formatPlannerProfileSourceLabel } from './plannerProfileSourceLabel.prod'

describe('production planner profile source label', () => {
  it('生产构建始终输出浏览器同步快照标签', () => {
    expect(formatPlannerProfileSourceLabel()).toBe('浏览器同步快照')
  })
})
