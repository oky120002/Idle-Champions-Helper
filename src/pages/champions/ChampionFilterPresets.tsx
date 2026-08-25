import type { ChampionFilterPreset } from '../../domain/types'
import { useI18n } from '../../app/i18n'

interface ChampionFilterPresetsProps {
  readonly presets: ChampionFilterPreset[]
  readonly onSave: () => void
  readonly onRestore: (preset: ChampionFilterPreset) => void
  readonly onDelete: (presetId: string) => void
}

export function ChampionFilterPresets({ presets, onSave, onRestore, onDelete }: ChampionFilterPresetsProps) {
  const { t } = useI18n()
  return (
    <section className="surface-card" aria-label={t("常用筛选组合")}>
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">{t("筛选组合")}</p>
          <h3 className="surface-card__title">{t("常用筛选组合")}</h3>
        </div>
        <button type="button" className="action-button action-button--secondary" onClick={onSave}>
          {t("保存当前筛选")}
        </button>
      </div>
      {presets.length > 0 ? (
        <ul className="surface-card__body">
          {presets.map((preset) => (
            <li key={preset.id}>
              <button type="button" onClick={() => onRestore(preset)}>{preset.name}</button>
              <button type="button" aria-label={t("删除筛选组合：{p0}", { p0: preset.name })} onClick={() => onDelete(preset.id)}>{t("删除")}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
