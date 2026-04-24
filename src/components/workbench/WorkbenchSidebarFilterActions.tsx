import { WorkbenchSidebarFilterStatus } from './WorkbenchScaffold'

interface WorkbenchSidebarFilterActionsProps {
  activeCount: number
  clearLabel: string
  onClear?: () => void
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
