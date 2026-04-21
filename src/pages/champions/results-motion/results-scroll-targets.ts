export function getResultsPaneTargetTop(): number {
  return 0
}

export function getResultsPaneTargetBottom(pane: HTMLElement): number {
  return Math.max(pane.scrollHeight - pane.clientHeight, 0)
}
