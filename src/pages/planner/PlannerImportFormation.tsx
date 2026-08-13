import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { loadVersion } from '../../data/client'
import { saveRecentFormationDraft } from '../../data/formationDraftStore'
import { DRAFT_SCHEMA_VERSION } from '../formation/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import type { ScenarioRef } from '../../domain/types'

interface PlannerImportFormationProps {
  readonly result: PlannerResult | null
  readonly layoutId: string | null
  readonly scenarioRef: ScenarioRef | null
}

/**
 * 推荐结果导入阵型编辑器：写 recent formationDraft（复用 formationDraftStore），
 * 跳转 /formation；编辑器启动时读 recent draft 提示恢复，落地为可继续编辑的阵型。
 */
export function PlannerImportFormation({ result, layoutId, scenarioRef }: PlannerImportFormationProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!result || layoutId == null || layoutId === '') {
    return null
  }

  async function handleImport() {
    if (result == null || layoutId == null || layoutId === '') {
      return
    }
    setImporting(true)
    setError(null)
    try {
      // dataVersion 复用当前数据版本（loadVersion 命中 formation 启动时已写入的内存缓存），
      // 让 formation 编辑器恢复 draft 时走「版本一致」快路径，不触发对不存在路径的 404 加载。
      const { current: dataVersion } = await loadVersion()
      await saveRecentFormationDraft({
        dataVersion,
        scenarioRef,
        layoutId,
        schemaVersion: DRAFT_SCHEMA_VERSION,
        placements: result.placements,
        updatedAt: new Date().toISOString(),
      })
      await navigate('/formation')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setImporting(false)
    }
  }

  return (
    <section
      className="surface-card planner-import-formation"
      aria-label={t("导入阵型编辑器")}
    >
      <div className="surface-card__body planner-import-formation__body">
        <div className="planner-import-formation__copy">
          <strong>{t("导入阵型编辑器继续调整")}</strong>
          <p>
            {t("把当前推荐写为最近草稿并跳转到阵型编辑器，落地后可继续拖拽调整。")}
          </p>
          {error != null && error !== '' ? <span className="planner-import-formation__status" role="alert">{error}</span> : null}
        </div>
        <button
          type="button"
          data-testid="planner-import-formation"
          className="action-button"
          onClick={() => void handleImport()}
          disabled={importing}
        >
          {importing ? t("导入中") : t("导入阵型编辑器")}
        </button>
      </div>
    </section>
  )
}
