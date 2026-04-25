import type { ReactNode } from 'react'

type ActionButtonTone = 'primary' | 'secondary' | 'ghost'

export interface ActionButtonItem {
  id: string
  label: ReactNode
  onClick: () => void
  tone?: ActionButtonTone
  disabled?: boolean
  hidden?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

interface ActionButtonsProps {
  items: ActionButtonItem[]
  wrap?: boolean
  className?: string
}

function getActionButtonClassName(item: ActionButtonItem): string {
  const toneClassName =
    item.tone === 'secondary'
      ? 'action-button--secondary'
      : item.tone === 'ghost'
        ? 'action-button--ghost'
        : ''

  return ['action-button', toneClassName, item.className].filter(Boolean).join(' ')
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
    <button
      key={item.id}
      type={item.type ?? 'button'}
      className={getActionButtonClassName(item)}
      {...(item.disabled ? { disabled: true } : {})}
      onClick={item.onClick}
    >
      {item.label}
    </button>
  ))

  if (!wrap) {
    return <>{buttons}</>
  }

  return <div className={className}>{buttons}</div>
}
