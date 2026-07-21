import { describe, expect, it } from 'vitest'
import { calculateChampionRosterFlyoutPosition } from './championRosterFlyoutPosition'

describe('champion roster flyout position', () => {
  it('左侧头像点击后优先贴着右侧展开，并且不遮住锚点', () => {
    const anchorRect = {
      top: 180,
      bottom: 268,
      left: 320,
      right: 408,
      height: 88,
      width: 88,
    }
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect,
      viewportWidth: 1440,
      viewportHeight: 900,
      flyoutWidth: 420,
      flyoutHeight: 520,
    })

    expect(position.left).toBeGreaterThan(anchorRect.right)
    expect(position.left - anchorRect.right).toBeLessThanOrEqual(16)
    expect(position.top).toBe(176)
  })

  it('右侧头像点击后优先贴着左侧展开，并且不遮住锚点', () => {
    const anchorRect = {
      top: 240,
      bottom: 328,
      left: 1168,
      right: 1256,
      height: 88,
      width: 88,
    }
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect,
      viewportWidth: 1440,
      viewportHeight: 900,
      flyoutWidth: 420,
      flyoutHeight: 520,
    })

    expect(position.left + 420).toBeLessThan(anchorRect.left)
    expect(anchorRect.left - (position.left + 420)).toBeLessThanOrEqual(16)
    expect(position.left + 420).toBeLessThanOrEqual(1440 - 14)
    expect(position.top).toBe(236)
  })

  it('空间不足时会把浮层顶部钳制回视口内', () => {
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect: {
        top: 12,
        bottom: 100,
        left: 640,
        right: 728,
        height: 88,
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

  it('窄屏时上下都放得下就优先选择空间更大的一侧', () => {
    const anchorRect = {
      top: 300,
      bottom: 388,
      left: 36,
      right: 212,
      height: 88,
      width: 176,
    }
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect,
      viewportWidth: 720,
      viewportHeight: 900,
      flyoutWidth: 692,
      flyoutHeight: 280,
    })

    expect(position.top).toBeGreaterThanOrEqual(anchorRect.bottom + 8)
    expect(position.left).toBeGreaterThanOrEqual(14)
    expect(position.maxHeight).toBeGreaterThanOrEqual(220)
  })

  it('窄屏时只有上方能完整容纳就放到上方', () => {
    const anchorRect = {
      top: 420,
      bottom: 508,
      left: 36,
      right: 212,
      height: 88,
      width: 176,
    }
    const position = calculateChampionRosterFlyoutPosition({
      anchorRect,
      viewportWidth: 720,
      viewportHeight: 900,
      flyoutWidth: 692,
      flyoutHeight: 280,
    })

    expect(position.top + 280).toBeLessThanOrEqual(anchorRect.top - 8)
  })
})
