function resolveCompactPreferAbove(fitsAbove: boolean, fitsBelow: boolean, spaceAbove: number, spaceBelow: number): boolean {
  if (fitsAbove && fitsBelow) return spaceAbove > spaceBelow
  if (fitsAbove) return true
  if (fitsBelow) return false
  return spaceAbove >= spaceBelow
}

interface FlyoutAnchorRect {
  top: number
  bottom: number
  left: number
  right: number
  height: number
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
  maxHeight: number
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
  const isCompactViewport = viewportWidth <= 980
  const anchorCenterX = anchorRect.left + anchorRect.width / 2
  const minLeft = viewportGutter
  const maxLeft = Math.max(viewportGutter, viewportWidth - flyoutWidth - viewportGutter)
  const maxTop = Math.max(viewportGutter, viewportHeight - flyoutHeight - viewportGutter)
  const hasRightSpace = anchorRect.right + FLYOUT_ANCHOR_GAP + flyoutWidth <= viewportWidth - viewportGutter
  const hasLeftSpace = anchorRect.left - FLYOUT_ANCHOR_GAP - flyoutWidth >= viewportGutter
  const spaceAbove = Math.max(0, anchorRect.top - viewportGutter - FLYOUT_ANCHOR_GAP)
  const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - viewportGutter - FLYOUT_ANCHOR_GAP)

  let left = clamp(anchorCenterX - flyoutWidth / 2, minLeft, maxLeft)

  if (!isCompactViewport && hasRightSpace && (!hasLeftSpace || anchorCenterX <= viewportWidth / 2)) {
    left = anchorRect.right + FLYOUT_ANCHOR_GAP
  } else if (!isCompactViewport && hasLeftSpace) {
    left = anchorRect.left - flyoutWidth - FLYOUT_ANCHOR_GAP
  }

  if (isCompactViewport) {
    const compactMaxHeight = Math.max(220, Math.max(spaceAbove, spaceBelow))
    const fitsAbove = spaceAbove >= flyoutHeight
    const fitsBelow = spaceBelow >= flyoutHeight
    const preferAbove = resolveCompactPreferAbove(fitsAbove, fitsBelow, spaceAbove, spaceBelow)
    const top = preferAbove
      ? clamp(anchorRect.top - Math.min(flyoutHeight, compactMaxHeight) - FLYOUT_ANCHOR_GAP, viewportGutter, maxTop)
      : clamp(anchorRect.bottom + FLYOUT_ANCHOR_GAP, viewportGutter, maxTop)

    return {
      left: clamp(left, minLeft, maxLeft),
      maxHeight: compactMaxHeight,
      top,
    }
  }

  return {
    left: clamp(left, minLeft, maxLeft),
    top: clamp(anchorRect.top - verticalOffset, viewportGutter, maxTop),
    maxHeight: Math.max(280, viewportHeight - viewportGutter * 2),
  }
}
