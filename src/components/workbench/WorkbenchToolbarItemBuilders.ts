import { Eye, EyeOff, Shuffle, Link2  } from 'lucide-react'
import { createElement } from 'react'
import type { TranslateParams, LocaleText  } from '../../app/i18n'
import type { WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from './useWorkbenchShareLink'

type WorkbenchTranslate = (text: string | LocaleText, params?: TranslateParams) => string

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
    ? t("收起到默认 {p0}", { p0: String(defaultVisibleCount) })
    : t("显示全部 {p0}（默认 {p1}）", { p0: String(filteredCount), p1: String(defaultVisibleCount) })

  return {
    id: 'toggle-visibility',
    icon: createElement(showAllResults ? EyeOff : Eye, { 'aria-hidden': true, strokeWidth: 1.9 }),
    isActive: showAllResults,
    ariaPressed: showAllResults,
    variant: 'prominent',
    hidden: !isReady || !canToggle,
    label,
    onClick,
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
      ? t("重新随机")
      : t("随机排序"),
    icon: createElement(Shuffle, { 'aria-hidden': true, strokeWidth: 1.9 }),
    isActive: hasRandomOrder,
    hidden: !isReady || resultCount <= 1,
    onClick,
  }
}

export function createWorkbenchShareItem({
  t,
  state,
  onCopy,
}: WorkbenchShareItemOptions): WorkbenchToolbarItemConfig {
  let label: string
  let title: string
  if (state === 'success') {
    label = t("已复制链接")
    title = t("链接已复制到剪贴板")
  } else if (state === 'error') {
    label = t("复制失败")
    title = t("复制失败，点击重试")
  } else {
    label = ''
    title = t("复制当前页面链接")
  }

  return {
    id: 'share-link',
    kind: 'button',
    icon: createElement(Link2, { 'aria-hidden': true, strokeWidth: 2.2 }),
    onClick: onCopy,
    tone: 'share',
    isActive: state === 'success',
    label,
    title,
    state,
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
            isReady,
            resultCount: filteredCount,
            hasRandomOrder: shuffle.hasRandomOrder,
            onClick: shuffle.onShuffle,
          }),
        ]
      : []),
    createWorkbenchShareItem({
      t,
      onCopy,
      state: shareState,
    }),
  ]
}
