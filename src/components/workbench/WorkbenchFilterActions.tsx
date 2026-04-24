import type { LocaleText } from '../../app/i18n'
import { WorkbenchSidebarFilterStatus } from './WorkbenchScaffold'
import type { WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from './useWorkbenchShareLink'

type WorkbenchTranslate = (text: LocaleText) => string

interface WorkbenchSidebarFilterActionsProps {
  activeCount: number
  clearLabel: string
  onClear?: () => void
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

export function WorkbenchSidebarFilterActions({
  activeCount,
  clearLabel,
  onClear,
}: WorkbenchSidebarFilterActionsProps) {
  return (
    <>
      <WorkbenchSidebarFilterStatus activeCount={activeCount} />
      {activeCount > 0 && onClear !== undefined ? (
        <button
          type="button"
          className="action-button action-button--secondary action-button--compact"
          onClick={onClear}
        >
          {clearLabel}
        </button>
      ) : null}
    </>
  )
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
