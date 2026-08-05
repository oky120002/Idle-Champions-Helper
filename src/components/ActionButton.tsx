import type { ComponentProps, ReactNode } from 'react'
import { buildActionButtonClassName } from './actionButtonClassName'

export type ActionButtonTone = 'primary' | 'secondary' | 'ghost'
interface ActionButtonProps {
  readonly children: ReactNode
  readonly onClick: () => void | Promise<void>
  readonly icon?: ReactNode
  readonly tone?: ActionButtonTone | undefined
  readonly compact?: boolean | undefined
  readonly toggled?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly className?: string | undefined
  // HTML button type 由规范定义，不可缩减；引用 React 内建类型避免重复字面量联合触发 max-union-size
  readonly type?: ComponentProps<'button'>['type']
  readonly ariaPressed?: boolean | undefined
  readonly ariaExpanded?: boolean | undefined
  readonly ariaControls?: string | undefined
  readonly ariaLabel?: string | undefined
  readonly title?: string | undefined
  readonly disabledReason?: string | undefined
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
      onClick={() => void onClick()}
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
  if (disabled && disabledReason != null && disabledReason !== '') {
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
