import type { LocaleText } from '../../app/i18n'
import type { WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from './useWorkbenchShareLink'

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
  state: WorkbenchShareLinkState
  onCopy: () => Promise<void>
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
    onClick,
    isActive: hasRandomOrder,
    hidden: !isReady || resultCount <= 1,
  }
}

export function createWorkbenchShareItem({
  state,
  onCopy,
}: WorkbenchShareItemOptions): WorkbenchToolbarItemConfig {
  return {
    id: 'share-link',
    kind: 'share',
    state,
    onCopy,
  }
}
