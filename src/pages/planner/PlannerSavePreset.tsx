import { useState } from 'react'
import { useI18n } from '../../app/i18n'
import { loadVersion } from '../../data/client'
import { saveFormationPreset } from '../../data/formationPresetStore'
import { PRESET_SCHEMA_VERSION } from '../formation/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import type { FormationPreset, ScenarioRef } from '../../domain/types/formation'

interface PlannerSavePresetProps {
  readonly result: PlannerResult | null
  readonly layoutId: string | null
  readonly scenarioRef: ScenarioRef | null
}

export function PlannerSavePreset({ result, layoutId, scenarioRef }: PlannerSavePresetProps) {
  const { t } = useI18n()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (result === null || layoutId === null || layoutId === '') {
    return (
      <section className="surface-card planner-save-preset" aria-label={t("结果保存")}>
        <div className="surface-card__body planner-save-preset__body">
          <div className="planner-save-preset__copy">
            <strong>{t("尚无可保存方案")}</strong>
            <p>{t("先让 planner 生成一条合法推荐，再把结果存进方案存档。")}</p>
          </div>
          <button type="button" className="action-button" disabled>{t("保存")}</button>
        </div>
      </section>
    )
  }

  const presetResult = result
  const presetLayoutId = layoutId

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const now = new Date().toISOString()
      const { current: dataVersion } = await loadVersion()
      const preset: FormationPreset = {
        dataVersion,
        scenarioRef,
        id: `planner-${String(Date.now())}`,
        schemaVersion: PRESET_SCHEMA_VERSION,
        name: t("自动计划推荐"),
        description: t("自动计划生成，目标值 {p0}", { p0: presetResult.objectiveValue }),
        layoutId: presetLayoutId,
        placements: presetResult.placements,
        scenarioTags: scenarioRef ? [`${scenarioRef.kind}:${scenarioRef.id}`] : [],
        priority: 'medium',
        filterSnapshot: null,
        createdAt: now,
        updatedAt: now,
      }

      await saveFormationPreset(preset)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="surface-card planner-save-preset" aria-label={t("结果保存")}>
      <div className="surface-card__body planner-save-preset__body">
        <div className="planner-save-preset__copy">
          <strong>{t("把当前推荐写入方案存档")}</strong>
          <p>{t("保存后可回到“方案存档”继续编辑或覆盖命名方案。")}</p>
          {saved ? <span className="planner-save-preset__status">{t("已保存")}</span> : null}
          {error != null && error !== '' ? <span className="planner-save-preset__status" role="alert">{error}</span> : null}
        </div>
        <button
          type="button"
          className="action-button action-button--secondary"
          onClick={() => void handleSave()}
          disabled={saving || saved}
        >
          {saving ? t("保存中") : t("保存")}
        </button>
      </div>
    </section>
  )
}
