import { describe, expect, it } from 'vitest'
import { calculateChampionRosterFlyoutPosition } from '../../../src/pages/champions/championRosterFlyoutPosition'

describe('champion roster flyout position', () => {
  it('左侧头像点击后保持贴近锚点，而不是被推到远处空白区', () => {
    const anchorRect = {
      top: 180,
      left: 320,
      right: 408,
      width: 88,
    }
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect,
      viewportWidth: 1440,
      viewportHeight: 900,
      flyoutWidth: 420,
      flyoutHeight: 520,
    })

    expect(position.left).toBeLessThan(anchorRect.left)
    expect(anchorRect.left - position.left).toBeLessThan(80)
    expect(position.top).toBe(176)
  })

  it('右侧头像点击后仍完整留在视口内', () => {
    const anchorRect = {
      top: 240,
      left: 1168,
      right: 1256,
      width: 88,
    }
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect,
      viewportWidth: 1440,
      viewportHeight: 900,
      flyoutWidth: 420,
      flyoutHeight: 520,
    })

    expect(position.left).toBeLessThan(anchorRect.left)
    expect(anchorRect.right - position.left).toBeLessThan(420)
    expect(position.left + 420).toBeLessThanOrEqual(1440 - 14)
    expect(position.top).toBe(236)
  })

  it('空间不足时会把浮层顶部钳制回视口内', () => {
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect: {
        top: 12,
        left: 640,
        right: 728,
        width: 88,
      },
      viewportWidth: 1280,
      viewportHeight: 640,
      flyoutWidth: 420,
      flyoutHeight: 620,
    })

    expect(position.top).toBe(14)
    expect(position.left).toBeGreaterThanOrEqual(14)
  })
})
