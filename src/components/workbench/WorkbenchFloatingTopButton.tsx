import { ArrowUpToLine } from 'lucide-react'
import { useI18n } from '../../app/i18n'

interface WorkbenchFloatingTopButtonProps {
  onClick: () => void
  ariaLabel?: string
  detailLabel?: string
}

export function WorkbenchFloatingTopButton({
  onClick,
  ariaLabel,
  detailLabel,
}: WorkbenchFloatingTopButtonProps) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      className="page-workbench__floating-top-button"
      onClick={onClick}
      aria-label={ariaLabel ?? t({ zh: '返回顶部', en: 'Back to top' })}
    >
      <span className="page-workbench__floating-top-icon" aria-hidden="true">
        <ArrowUpToLine aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="page-workbench__floating-top-copy">
        <strong>{t({ zh: '返回顶部', en: 'Back to top' })}</strong>
        <span>{detailLabel ?? t({ zh: '当前内容', en: 'Current pane' })}</span>
      </span>
    </button>
  )
}
