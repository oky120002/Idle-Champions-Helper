import type { ReactNode } from 'react'

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
    <button
      type="button"
      className={joinClasses(
        'workbench-page__toolbar-action',
        variant === 'prominent' && 'workbench-page__toolbar-action--prominent',
        'action-button',
        'action-button--ghost',
        'action-button--compact',
        isActive && 'action-button--toggled',
        className,
      )}
      aria-pressed={ariaPressed}
      onClick={() => {
        void onClick()
      }}
    >
      {children}
    </button>
  )
}
