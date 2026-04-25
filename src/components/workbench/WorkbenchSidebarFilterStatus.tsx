import { useI18n } from '../../app/i18n'
import { WorkbenchToolbarBadge } from './WorkbenchScaffold'

interface WorkbenchSidebarFilterStatusProps {
  activeCount: number
  className?: string
}

export function WorkbenchSidebarFilterStatus({
  activeCount,
  className,
}: WorkbenchSidebarFilterStatusProps) {
  const { t } = useI18n()

  return (
    <WorkbenchToolbarBadge variant="filter" {...(className !== undefined ? { className } : {})}>
      {activeCount > 0
        ? t({ zh: `${activeCount} 项已启用`, en: `${activeCount} active` })
        : t({ zh: '当前未启用条件', en: 'No active filters' })}
    </WorkbenchToolbarBadge>
  )
}
