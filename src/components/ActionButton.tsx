import type { ReactNode } from 'react'
import { buildActionButtonClassName } from './actionButtonClassName'

export type ActionButtonTone = 'primary' | 'secondary' | 'ghost'
interface ActionButtonProps {
  children: ReactNode
  onClick: () => void | Promise<void>
  icon?: ReactNode
  tone?: ActionButtonTone | undefined
  compact?: boolean | undefined
  toggled?: boolean | undefined
  disabled?: boolean | undefined
  className?: string | undefined
  type?: 'button' | 'submit' | 'reset' | undefined
  ariaPressed?: boolean | undefined
  ariaLabel?: string | undefined
  title?: string | undefined
}

export function ActionButton({
  children,
  onClick,
  icon,
  tone,
  compact = false,
  toggled = false,
  disabled = false,
  className,
  type = 'button',
  ariaPressed,
  ariaLabel,
  title,
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={buildActionButtonClassName({
        tone,
        compact,
        toggled,
        className: [icon !== undefined ? 'action-button--with-icon' : '', className].filter(Boolean).join(' '),
      })}
      {...(disabled ? { disabled: true } : {})}
      {...(ariaPressed !== undefined ? { 'aria-pressed': ariaPressed } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      {...(title !== undefined ? { title } : {})}
      onClick={() => {
        void onClick()
      }}
    >
      {icon !== undefined ? (
        <span className="action-button__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="action-button__label">{children}</span>
    </button>
  )
}
