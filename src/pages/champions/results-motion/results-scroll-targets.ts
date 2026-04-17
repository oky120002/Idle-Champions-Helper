export function getResultsTargetTop(shell: HTMLElement): number {
  const siteHeader = document.querySelector('.site-header')
  const headerHeight = siteHeader instanceof HTMLElement ? siteHeader.getBoundingClientRect().height : 0

  return Math.max(Math.round(shell.getBoundingClientRect().top + window.scrollY - headerHeight - 16), 0)
}

export function getResultsTargetBottom(shell: HTMLElement): number {
  const maxScrollTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
  const shellBottom = shell.getBoundingClientRect().bottom + window.scrollY
  const targetTop = Math.round(shellBottom - window.innerHeight + 24)

  return Math.min(Math.max(targetTop, 0), maxScrollTop)
}
