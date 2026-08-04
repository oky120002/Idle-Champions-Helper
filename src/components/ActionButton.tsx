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
  ariaExpanded?: boolean | undefined
  ariaControls?: string | undefined
  ariaLabel?: string | undefined
  title?: string | undefined
  disabledReason?: string | undefined
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
  ariaExpanded,
  ariaControls,
  ariaLabel,
  title,
  disabledReason,
}: ActionButtonProps) {
  const button = (
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
      {...(ariaExpanded !== undefined ? { 'aria-expanded': ariaExpanded } : {})}
      {...(ariaControls !== undefined ? { 'aria-controls': ariaControls } : {})}
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

  // disabled 按钮不响应 hover/focus、原生 title 也无法触发；
  // 用外层 wrapper 承接 hover/focus-within 显示 disabledReason 气泡。
  if (disabled && disabledReason) {
    return (
      <span className="action-button--with-tooltip">
        {button}
        <span className="action-button__tooltip" role="tooltip">
          {disabledReason}
        </span>
      </span>
    )
  }

  return button
}
