import type { ReactNode } from 'react'
import { ActionButton } from '../ActionButton'

interface WorkbenchToolbarActionButtonProps {
  children: ReactNode
  onClick: () => void | Promise<void>
  isActive?: boolean
  ariaPressed?: boolean
  variant?: 'default' | 'prominent'
  className?: string
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchToolbarActionButton({
  children,
  onClick,
  isActive = false,
  ariaPressed,
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
      onClick={onClick}
    >
      {children}
    </ActionButton>
  )
}
