import type { ReactNode } from 'react'
import type {
  WorkbenchBadgeTone,
  WorkbenchBadgeVariant,
  WorkbenchShareState,
} from './WorkbenchScaffold'
import {
  WorkbenchToolbarActionCluster,
  WorkbenchToolbarBadge,
} from './WorkbenchScaffold'
import { WorkbenchShareButton } from './WorkbenchShareButton'
import { WorkbenchToolbarActionButton } from './WorkbenchToolbarActionButton'

interface WorkbenchToolbarBaseAction {
  id: string
  hidden?: boolean
}

interface WorkbenchToolbarButtonAction extends WorkbenchToolbarBaseAction {
  kind?: 'button'
  label: ReactNode
  onClick: () => void | Promise<void>
  icon?: ReactNode
  isActive?: boolean
  ariaPressed?: boolean
  variant?: 'default' | 'prominent'
}

interface WorkbenchToolbarShareAction extends WorkbenchToolbarBaseAction {
  kind: 'share'
  state: WorkbenchShareState
  onCopy: () => void | Promise<void>
}

interface WorkbenchToolbarBadgeAction extends WorkbenchToolbarBaseAction {
  kind: 'badge'
  label: ReactNode
  variant?: WorkbenchBadgeVariant
  tone?: WorkbenchBadgeTone
}

export type WorkbenchToolbarItemConfig =
  | WorkbenchToolbarButtonAction
  | WorkbenchToolbarBadgeAction
  | WorkbenchToolbarShareAction

interface WorkbenchToolbarItemsProps {
  items: WorkbenchToolbarItemConfig[]
  layout?: 'inline' | 'cluster'
  className?: string
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchToolbarItems({
  items,
  layout = 'inline',
  className,
}: WorkbenchToolbarItemsProps) {
  const visibleItems = items.filter((item) => !item.hidden)

  if (visibleItems.length === 0) {
    return null
  }

  const renderedItems = visibleItems.map((item) => {
    if (item.kind === 'share') {
      return (
        <WorkbenchShareButton
          key={item.id}
          state={item.state}
          onCopy={item.onCopy}
        />
      )
    }

    if (item.kind === 'badge') {
      return (
        <WorkbenchToolbarBadge
          key={item.id}
          {...(item.variant !== undefined ? { variant: item.variant } : {})}
          {...(item.tone !== undefined ? { tone: item.tone } : {})}
        >
          {item.label}
        </WorkbenchToolbarBadge>
      )
    }

    return (
      <WorkbenchToolbarActionButton
        key={item.id}
        onClick={item.onClick}
        {...(item.icon !== undefined ? { icon: item.icon } : {})}
        {...(typeof item.label === 'string' ? { ariaLabel: item.label } : {})}
        {...(item.variant !== undefined ? { variant: item.variant } : {})}
        {...(item.isActive !== undefined ? { isActive: item.isActive } : {})}
        {...(item.ariaPressed !== undefined ? { ariaPressed: item.ariaPressed } : {})}
      >
        {item.label}
      </WorkbenchToolbarActionButton>
    )
  })

  if (layout === 'cluster') {
    return (
      <WorkbenchToolbarActionCluster className={joinClasses('workbench-page__toolbar-items', className)}>
        {renderedItems}
      </WorkbenchToolbarActionCluster>
    )
  }

  return (
    <div className={joinClasses('workbench-page__toolbar-items', className)}>
      {renderedItems}
    </div>
  )
}
