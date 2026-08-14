import type { CSSProperties } from 'react'
import type { AppLocale, MessageRef , TranslateParams} from '../../app/i18n'
import { getFormationBoardMetrics } from '../../domain/formationLayout'
import type { FormationLayout } from '../../domain/types'

type VariantFormationMiniBoardProps = {
  readonly formation: FormationLayout | null
  readonly locale: AppLocale
  readonly t: (text: string | MessageRef, params?: TranslateParams) => string
}

export function VariantFormationMiniBoard({ formation, locale, t }: VariantFormationMiniBoardProps) {
  if (!formation) {
    return (
      <div className="variant-mini-board variant-mini-board--missing">
        <strong>{t("阵型图")}</strong>
        <span>{t("当前没有命中官方布局映射")}</span>
      </div>
    )
  }

  const metrics = getFormationBoardMetrics(formation)
  const rowCount = Math.max(...formation.slots.map((slot) => slot.row), 1)
  const style = {
    '--variant-board-columns': String(metrics.columnCount),
    '--variant-board-rows': String(rowCount),
  } as CSSProperties

  return (
    <div className="variant-mini-board-wrap">
      <div className="variant-mini-board__header">
        <strong>{t("阵型图")}</strong>
        <span>
          {locale === 'zh-CN'
            ? `${String(formation.slots.length)} 槽`
            : `${String(formation.slots.length)} slots`}
        </span>
      </div>
      <div className="variant-mini-board" style={style} aria-hidden="true">
        {formation.slots.map((slot, index) => (
          <span
            key={slot.id}
            className="variant-mini-board__slot"
            style={{ gridColumn: slot.column, gridRow: slot.row }}
          >
            {index + 1}
          </span>
        ))}
      </div>
    </div>
  )
}
