import type { ReactNode } from 'react'
import { ActionButton } from '../ActionButton'

interface WorkbenchToolbarActionButtonProps {
  children: ReactNode
  onClick: () => void | Promise<void>
  icon?: ReactNode
  isActive?: boolean
  ariaPressed?: boolean
  ariaLabel?: string
  variant?: 'default' | 'prominent'
  className?: string
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchToolbarActionButton({
  children,
  onClick,
  icon,
  isActive = false,
  ariaPressed,
  ariaLabel,
  variant = 'default',
  className,
}: WorkbenchToolbarActionButtonProps) {
  return (
    <ActionButton
      tone="ghost"
      compact
      toggled={isActive}
      className={joinClasses(
        'workbench-page__toolbar-action',
        variant === 'prominent' && 'workbench-page__toolbar-action--prominent',
        className,
      )}
      ariaPressed={ariaPressed}
      {...(ariaLabel !== undefined ? { ariaLabel } : {})}
      {...(ariaLabel !== undefined ? { title: ariaLabel } : {})}
      icon={icon}
      onClick={onClick}
    >
      {children}
    </ActionButton>
  )
}
