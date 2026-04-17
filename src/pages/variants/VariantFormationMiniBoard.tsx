import type { CSSProperties } from 'react'
import type { AppLocale, LocaleText } from '../../app/i18n'
import { getFormationBoardMetrics } from '../../domain/formationLayout'
import type { FormationLayout } from '../../domain/types'

type VariantFormationMiniBoardProps = {
  formation: FormationLayout | null
  locale: AppLocale
  t: (text: LocaleText) => string
}

export function VariantFormationMiniBoard({ formation, locale, t }: VariantFormationMiniBoardProps) {
  if (!formation) {
    return (
      <div className="variant-mini-board variant-mini-board--missing">
        <strong>{t({ zh: '阵型图', en: 'Formation' })}</strong>
        <span>{t({ zh: '当前没有命中官方布局映射', en: 'No official formation mapping yet' })}</span>
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
        <strong>{t({ zh: '阵型图', en: 'Formation' })}</strong>
        <span>
          {locale === 'zh-CN'
            ? `${formation.slots.length} 槽`
            : `${formation.slots.length} slots`}
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
