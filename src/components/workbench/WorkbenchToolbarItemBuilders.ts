import { Eye, EyeOff, Shuffle } from 'lucide-react'
import { createElement } from 'react'
import type { LocaleText } from '../../app/i18n'
import type { WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from './useWorkbenchShareLink'
import { Link2 } from 'lucide-react'

type WorkbenchTranslate = (text: LocaleText) => string

interface WorkbenchBadgeItemOptions {
  id: string
  label: string
  tone?: 'default' | 'muted'
  hidden?: boolean
}

interface WorkbenchResultVisibilityItemOptions {
  t: WorkbenchTranslate
  defaultVisibleCount: number
  filteredCount: number
  showAllResults: boolean
  canToggle: boolean
  isReady: boolean
  onClick: () => void
}

interface WorkbenchShuffleItemOptions {
  t: WorkbenchTranslate
  resultCount: number
  hasRandomOrder: boolean
  isReady: boolean
  onClick: () => void
}

interface WorkbenchShareItemOptions {
  t: WorkbenchTranslate
  state: WorkbenchShareLinkState
  onCopy: () => Promise<void>
}

interface WorkbenchFilterToolbarItemsOptions {
  t: WorkbenchTranslate
  defaultVisibleCount: number
  filteredCount: number
  showAllResults: boolean
  canToggle: boolean
  isReady: boolean
  onToggleVisibility: () => void
  shareState: WorkbenchShareLinkState
  onCopy: () => Promise<void>
  shuffle?:
    | {
        hasRandomOrder: boolean
        onShuffle: () => void
      }
    | undefined
}

export function createWorkbenchBadgeItem({
  id,
  label,
  tone,
  hidden,
}: WorkbenchBadgeItemOptions): WorkbenchToolbarItemConfig {
  return {
    id,
    kind: 'badge',
    label,
    ...(tone !== undefined ? { tone } : {}),
    ...(hidden !== undefined ? { hidden } : {}),
  }
}

export function createWorkbenchResultVisibilityItem({
  t,
  defaultVisibleCount,
  filteredCount,
  showAllResults,
  canToggle,
  isReady,
  onClick,
}: WorkbenchResultVisibilityItemOptions): WorkbenchToolbarItemConfig {
  const label = showAllResults
    ? t({ zh: `收起到默认 ${defaultVisibleCount}`, en: `Collapse to default ${defaultVisibleCount}` })
    : t({
        zh: `显示全部 ${filteredCount}（默认 ${defaultVisibleCount}）`,
        en: `Show all ${filteredCount} (default ${defaultVisibleCount})`,
      })

  return {
    id: 'toggle-visibility',
    label,
    icon: createElement(showAllResults ? EyeOff : Eye, { 'aria-hidden': true, strokeWidth: 1.9 }),
    onClick,
    isActive: showAllResults,
    ariaPressed: showAllResults,
    variant: 'prominent',
    hidden: !isReady || !canToggle,
  }
}

export function createWorkbenchShuffleItem({
  t,
  resultCount,
  hasRandomOrder,
  isReady,
  onClick,
}: WorkbenchShuffleItemOptions): WorkbenchToolbarItemConfig {
  return {
    id: 'shuffle-results',
    label: hasRandomOrder
      ? t({ zh: '重新随机', en: 'Reshuffle' })
      : t({ zh: '随机排序', en: 'Shuffle order' }),
    icon: createElement(Shuffle, { 'aria-hidden': true, strokeWidth: 1.9 }),
    onClick,
    isActive: hasRandomOrder,
    hidden: !isReady || resultCount <= 1,
  }
}

export function createWorkbenchShareItem({
  t,
  state,
  onCopy,
}: WorkbenchShareItemOptions): WorkbenchToolbarItemConfig {
  const label =
    state === 'success'
      ? t({ zh: '已复制链接', en: 'Link copied' })
      : state === 'error'
        ? t({ zh: '复制失败', en: 'Copy failed' })
        : ''
  const title =
    state === 'success'
      ? t({ zh: '链接已复制到剪贴板', en: 'Link copied to clipboard' })
      : state === 'error'
        ? t({ zh: '复制失败，点击重试', en: 'Copy failed. Click to retry' })
        : t({ zh: '复制当前页面链接', en: 'Copy current page link' })

  return {
    id: 'share-link',
    kind: 'button',
    label,
    title,
    icon: createElement(Link2, { 'aria-hidden': true, strokeWidth: 2.2 }),
    onClick: onCopy,
    tone: 'share',
    state,
    isActive: state === 'success',
  }
}

export function createWorkbenchFilterToolbarItems({
  t,
  defaultVisibleCount,
  filteredCount,
  showAllResults,
  canToggle,
  isReady,
  onToggleVisibility,
  shareState,
  onCopy,
  shuffle,
}: WorkbenchFilterToolbarItemsOptions): WorkbenchToolbarItemConfig[] {
  return [
    createWorkbenchResultVisibilityItem({
      t,
      defaultVisibleCount,
      filteredCount,
      showAllResults,
      canToggle,
      isReady,
      onClick: onToggleVisibility,
    }),
    ...(shuffle !== undefined
      ? [
          createWorkbenchShuffleItem({
            t,
            resultCount: filteredCount,
            hasRandomOrder: shuffle.hasRandomOrder,
            isReady,
            onClick: shuffle.onShuffle,
          }),
        ]
      : []),
    createWorkbenchShareItem({
      t,
      state: shareState,
      onCopy,
    }),
  ]
}
