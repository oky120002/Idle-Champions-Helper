import type { ReactNode } from 'react'
import type { WorkbenchShareState } from './WorkbenchScaffold'
import { WorkbenchToolbarActionCluster, WorkbenchShareButton } from './WorkbenchScaffold'
import { WorkbenchToolbarActionButton } from './WorkbenchToolbarActionButton'

interface WorkbenchToolbarBaseAction {
  id: string
  hidden?: boolean
}

interface WorkbenchToolbarButtonAction extends WorkbenchToolbarBaseAction {
  kind?: 'button'
  label: ReactNode
  onClick: () => void | Promise<void>
  isActive?: boolean
  ariaPressed?: boolean
  variant?: 'default' | 'prominent'
}

interface WorkbenchToolbarShareAction extends WorkbenchToolbarBaseAction {
  kind: 'share'
  state: WorkbenchShareState
  onCopy: () => void | Promise<void>
}

export type WorkbenchToolbarActionConfig =
  | WorkbenchToolbarButtonAction
  | WorkbenchToolbarShareAction

interface WorkbenchToolbarActionsProps {
  actions: WorkbenchToolbarActionConfig[]
  className?: string
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchToolbarActions({
  actions,
  className,
}: WorkbenchToolbarActionsProps) {
  const visibleActions = actions.filter((action) => !action.hidden)

  if (visibleActions.length === 0) {
    return null
  }

  return (
    <WorkbenchToolbarActionCluster className={joinClasses('workbench-page__toolbar-actions', className)}>
      {visibleActions.map((action) => {
        if (action.kind === 'share') {
          return (
            <WorkbenchShareButton
              key={action.id}
              state={action.state}
              onCopy={action.onCopy}
            />
          )
        }

        return (
          <WorkbenchToolbarActionButton
            key={action.id}
            onClick={action.onClick}
            {...(action.variant !== undefined ? { variant: action.variant } : {})}
            {...(action.isActive !== undefined ? { isActive: action.isActive } : {})}
            {...(action.ariaPressed !== undefined ? { ariaPressed: action.ariaPressed } : {})}
          >
            {action.label}
          </WorkbenchToolbarActionButton>
        )
      })}
    </WorkbenchToolbarActionCluster>
  )
}
