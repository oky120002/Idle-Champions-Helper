import { ActionButton } from '../ActionButton'
import { WorkbenchSidebarFilterStatus } from './WorkbenchSidebarFilterStatus'

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
        <ActionButton tone="secondary" compact onClick={onClear}>
          {clearLabel}
        </ActionButton>
      ) : null}
    </>
  )
}
