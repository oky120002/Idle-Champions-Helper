import type { ReactNode } from 'react'
import { ActionButton, type ActionButtonTone } from './ActionButton'

export interface ActionButtonItem {
  id: string
  label: ReactNode
  onClick: () => void | Promise<void>
  icon?: ReactNode
  tone?: ActionButtonTone
  disabled?: boolean
  hidden?: boolean
  compact?: boolean
  toggled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  ariaPressed?: boolean
  ariaLabel?: string
}

interface ActionButtonsProps {
  items: ActionButtonItem[]
  wrap?: boolean
  className?: string
}

export function ActionButtons({
  items,
  wrap = true,
  className = 'button-row',
}: ActionButtonsProps) {
  const visibleItems = items.filter((item) => !item.hidden)

  if (visibleItems.length === 0) {
    return null
  }

  const buttons = visibleItems.map((item) => (
    <ActionButton
      key={item.id}
      type={item.type}
      tone={item.tone}
      disabled={item.disabled}
      icon={item.icon}
      compact={item.compact}
      toggled={item.toggled}
      className={item.className}
      ariaPressed={item.ariaPressed}
      ariaLabel={item.ariaLabel}
      onClick={item.onClick}
    >
      {item.label}
    </ActionButton>
  ))

  if (!wrap) {
    return <>{buttons}</>
  }

  return <div className={className}>{buttons}</div>
}
