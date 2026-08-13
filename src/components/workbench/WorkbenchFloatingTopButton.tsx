import { ArrowUpToLine } from 'lucide-react'
import { useI18n } from '../../app/i18n'

interface WorkbenchFloatingTopButtonProps {
  readonly onClick: () => void
  readonly ariaLabel?: string
  readonly detailLabel?: string
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
      aria-label={ariaLabel ?? t("返回顶部")}
    >
      <span className="page-workbench__floating-top-icon" aria-hidden="true">
        <ArrowUpToLine aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="page-workbench__floating-top-copy">
        <strong>{t("返回顶部")}</strong>
        <span>{detailLabel ?? t("当前内容")}</span>
      </span>
    </button>
  )
}
