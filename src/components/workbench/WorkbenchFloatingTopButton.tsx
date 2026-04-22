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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 17.25v-10.5" strokeLinecap="round" />
          <path d="M7.75 10.25 12 6l4.25 4.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 18.25h12" strokeLinecap="round" />
        </svg>
      </span>
      <span className="page-workbench__floating-top-copy">
        <strong>{t({ zh: '返回顶部', en: 'Back to top' })}</strong>
        <span>{detailLabel ?? t({ zh: '当前内容', en: 'Current pane' })}</span>
      </span>
    </button>
  )
}
