interface FlyoutAnchorRect {
  top: number
  left: number
  right: number
  width: number
}

interface CalculateChampionRosterFlyoutPositionArgs {
  anchorRect: FlyoutAnchorRect
  viewportWidth: number
  viewportHeight: number
  flyoutWidth: number
  flyoutHeight: number
  viewportGutter?: number
  verticalOffset?: number
}

export interface ChampionRosterFlyoutPosition {
  top: number
  left: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function calculateChampionRosterFlyoutPosition({
  anchorRect,
  viewportWidth,
  viewportHeight,
  flyoutWidth,
  flyoutHeight,
  viewportGutter = 14,
  verticalOffset = 4,
}: CalculateChampionRosterFlyoutPositionArgs): ChampionRosterFlyoutPosition {
  const anchorCenterX = anchorRect.left + anchorRect.width / 2
  const anchorViewportRatio = clamp(anchorCenterX / viewportWidth, 0.2, 0.8)
  const minLeft = viewportGutter
  const maxLeft = Math.max(viewportGutter, viewportWidth - flyoutWidth - viewportGutter)
  const maxTop = Math.max(viewportGutter, viewportHeight - flyoutHeight - viewportGutter)

  return {
    left: clamp(anchorCenterX - flyoutWidth * anchorViewportRatio, minLeft, maxLeft),
    top: clamp(anchorRect.top - verticalOffset, viewportGutter, maxTop),
  }
}
