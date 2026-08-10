import { describe, expect, it } from 'vitest'

import { formatPlannerProfileSourceLabel } from './plannerProfileSourceLabel.prod'

describe('production planner profile source label', () => {
  it('zh-CN 输出浏览器同步快照标签', () => {
    expect(formatPlannerProfileSourceLabel('zh-CN')).toBe('浏览器同步快照')
  })

  it('en-US 输出 Browser sync snapshot', () => {
    expect(formatPlannerProfileSourceLabel('en-US')).toBe('Browser sync snapshot')
  })
})
