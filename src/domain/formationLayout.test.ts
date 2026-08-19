import { describe, expect, it } from 'vitest'
import { getFormationSlotLane } from './formationLayout'

describe('formation layout lane hints', () => {
  it('按 laneHints 返回槽位排位，缺少数据时返回 null', () => {
    const layout = {
      id: 'layout-1',
      name: { original: 'Layout', display: '布局' },
      slots: [],
      laneHints: { front: ['s3'], middle: ['s2'], back: ['s1'] },
    }

    expect(getFormationSlotLane(layout, 's1')).toBe('back')
    expect(getFormationSlotLane(layout, 's2')).toBe('middle')
    expect(getFormationSlotLane(layout, 's3')).toBe('front')
    expect(getFormationSlotLane(layout, 'missing')).toBeNull()
    const layoutWithoutHints = { id: layout.id, name: layout.name, slots: layout.slots }
    expect(getFormationSlotLane(layoutWithoutHints, 's1')).toBeNull()
  })
})
