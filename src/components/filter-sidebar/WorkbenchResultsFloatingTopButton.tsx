import { useI18n } from '../../app/i18n'

interface WorkbenchResultsFloatingTopButtonProps {
  onClick: () => void
}

export function WorkbenchResultsFloatingTopButton({ onClick }: WorkbenchResultsFloatingTopButtonProps) {
  const { t } = useI18n()

  return (
    <button
      type="button"
      className="filter-workbench__floating-top-button"
      onClick={onClick}
      aria-label={t({ zh: '返回结果顶部', en: 'Back to results top' })}
    >
      <span className="filter-workbench__floating-top-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 17.25v-10.5" strokeLinecap="round" />
          <path d="M7.75 10.25 12 6l4.25 4.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 18.25h12" strokeLinecap="round" />
        </svg>
      </span>
      <span className="filter-workbench__floating-top-copy">
        <strong>{t({ zh: '返回顶部', en: 'Back to top' })}</strong>
        <span>{t({ zh: '结果列表', en: 'Results list' })}</span>
      </span>
    </button>
  )
}
