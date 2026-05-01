import type { ReactNode } from 'react'
import { ActionButton } from '../ActionButton'
import type { WorkbenchShareState } from './WorkbenchScaffold'

interface WorkbenchToolbarActionButtonProps {
  children: ReactNode
  onClick: () => void | Promise<void>
  icon?: ReactNode
  iconOnly?: boolean
  isActive?: boolean
  ariaPressed?: boolean
  ariaExpanded?: boolean
  ariaControls?: string
  ariaLabel?: string
  variant?: 'default' | 'prominent'
  tone?: 'default' | 'share'
  state?: WorkbenchShareState
  title?: string
  className?: string
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchToolbarActionButton({
  children,
  onClick,
  icon,
  iconOnly = false,
  isActive = false,
  ariaPressed,
  ariaExpanded,
  ariaControls,
  ariaLabel,
  variant = 'default',
  tone = 'default',
  state,
  title,
  className,
}: WorkbenchToolbarActionButtonProps) {
  return (
    <ActionButton
      tone="ghost"
      compact
      toggled={isActive}
      className={joinClasses(
        'workbench-page__toolbar-action',
        iconOnly && 'workbench-page__toolbar-action--icon-only',
        variant === 'prominent' && 'workbench-page__toolbar-action--prominent',
        tone === 'share' && 'workbench-page__toolbar-action--share',
        state === 'success' && 'workbench-page__toolbar-action--success',
        state === 'error' && 'workbench-page__toolbar-action--error',
        className,
      )}
      ariaPressed={ariaPressed}
      ariaExpanded={ariaExpanded}
      ariaControls={ariaControls}
      {...(ariaLabel !== undefined ? { ariaLabel } : {})}
      {...(title !== undefined ? { title } : ariaLabel !== undefined ? { title: ariaLabel } : {})}
      icon={icon}
      onClick={onClick}
    >
      {children}
    </ActionButton>
  )
}
