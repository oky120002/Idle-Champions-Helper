import type { ReactNode } from 'react'
import { ActionButton } from '../ActionButton'
import type { WorkbenchShareState } from './WorkbenchScaffold'

interface WorkbenchToolbarActionButtonProps {
  readonly children: ReactNode
  readonly onClick: () => void | Promise<void>
  readonly icon?: ReactNode
  readonly iconOnly?: boolean
  readonly isActive?: boolean
  readonly ariaPressed?: boolean
  readonly ariaExpanded?: boolean
  readonly ariaControls?: string
  readonly ariaLabel?: string
  readonly variant?: 'default' | 'prominent'
  readonly tone?: 'default' | 'share'
  readonly state?: WorkbenchShareState
  readonly title?: string
  readonly className?: string
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
  const resolvedTitle = title ?? ariaLabel

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
      {...(resolvedTitle !== undefined ? { title: resolvedTitle } : {})}
      icon={icon}
      onClick={onClick}
    >
      {children}
    </ActionButton>
  )
}
