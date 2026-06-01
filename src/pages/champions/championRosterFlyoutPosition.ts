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

const FLYOUT_ANCHOR_GAP = 12

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
  const minLeft = viewportGutter
  const maxLeft = Math.max(viewportGutter, viewportWidth - flyoutWidth - viewportGutter)
  const maxTop = Math.max(viewportGutter, viewportHeight - flyoutHeight - viewportGutter)
  const hasRightSpace = anchorRect.right + FLYOUT_ANCHOR_GAP + flyoutWidth <= viewportWidth - viewportGutter
  const hasLeftSpace = anchorRect.left - FLYOUT_ANCHOR_GAP - flyoutWidth >= viewportGutter

  let left = clamp(anchorCenterX - flyoutWidth / 2, minLeft, maxLeft)

  if (hasRightSpace && (!hasLeftSpace || anchorCenterX <= viewportWidth / 2)) {
    left = anchorRect.right + FLYOUT_ANCHOR_GAP
  } else if (hasLeftSpace) {
    left = anchorRect.left - flyoutWidth - FLYOUT_ANCHOR_GAP
  }

  return {
    left: clamp(left, minLeft, maxLeft),
    top: clamp(anchorRect.top - verticalOffset, viewportGutter, maxTop),
  }
}
