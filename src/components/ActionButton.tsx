import type { ReactNode } from 'react'
import { buildActionButtonClassName } from './actionButtonClassName'

export type ActionButtonTone = 'primary' | 'secondary' | 'ghost'
interface ActionButtonProps {
  children: ReactNode
  onClick: () => void | Promise<void>
  tone?: ActionButtonTone | undefined
  compact?: boolean | undefined
  toggled?: boolean | undefined
  disabled?: boolean | undefined
  className?: string | undefined
  type?: 'button' | 'submit' | 'reset' | undefined
  ariaPressed?: boolean | undefined
  ariaLabel?: string | undefined
}

export function ActionButton({
  children,
  onClick,
  tone,
  compact = false,
  toggled = false,
  disabled = false,
  className,
  type = 'button',
  ariaPressed,
  ariaLabel,
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={buildActionButtonClassName({
        tone,
        compact,
        toggled,
        className,
      })}
      {...(disabled ? { disabled: true } : {})}
      {...(ariaPressed !== undefined ? { 'aria-pressed': ariaPressed } : {})}
      {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
      onClick={() => {
        void onClick()
      }}
    >
      {children}
    </button>
  )
}
