import type { ActionButtonTone } from './ActionButton'

interface ActionButtonClassNameOptions {
  tone?: ActionButtonTone | undefined
  compact?: boolean | undefined
  toggled?: boolean | undefined
  className?: string | undefined
}

export function buildActionButtonClassName({
  tone,
  compact = false,
  toggled = false,
  className,
}: ActionButtonClassNameOptions): string {
  return [
    'action-button',
    tone === 'secondary' ? 'action-button--secondary' : '',
    tone === 'ghost' ? 'action-button--ghost' : '',
    compact ? 'action-button--compact' : '',
    toggled ? 'action-button--toggled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
