import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { loadVersion } from '../../data/client'
import { saveRecentFormationDraft } from '../../data/formationDraftStore'
import { DRAFT_SCHEMA_VERSION } from '../formation/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import type { ScenarioRef } from '../../domain/types'

interface PlannerImportFormationProps {
  result: PlannerResult | null
  layoutId: string | null
  scenarioRef: ScenarioRef | null
}

/**
 * 推荐结果导入阵型编辑器（阶段 15.5）：写 recent formationDraft（复用 formationDraftStore），
 * 跳转 /formation；编辑器启动时读 recent draft 提示恢复，落地为可继续编辑的阵型。
 */
export function PlannerImportFormation({ result, layoutId, scenarioRef }: PlannerImportFormationProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!result || !layoutId) {
    return null
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      // dataVersion 复用当前数据版本（loadVersion 命中 formation 启动时已写入的内存缓存），
      // 让 formation 编辑器恢复 draft 时走「版本一致」快路径，不触发对不存在路径的 404 加载。
      const { current: dataVersion } = await loadVersion()
      await saveRecentFormationDraft({
        schemaVersion: DRAFT_SCHEMA_VERSION,
        dataVersion,
        layoutId: layoutId!,
        scenarioRef,
        placements: result!.placements,
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
      aria-label={t({ zh: '导入阵型编辑器', en: 'Import to formation editor' })}
    >
      <div className="surface-card__body planner-import-formation__body">
        <div className="planner-import-formation__copy">
          <strong>{t({ zh: '导入阵型编辑器继续调整', en: 'Open in formation editor' })}</strong>
          <p>
            {t({
              zh: '把当前推荐写为最近草稿并跳转到阵型编辑器，落地后可继续拖拽调整。',
              en: 'Write the current recommendation as the recent draft and jump to the formation editor to keep tweaking.',
            })}
          </p>
          {error ? <span className="planner-import-formation__status" role="alert">{error}</span> : null}
        </div>
        <button
          type="button"
          data-testid="planner-import-formation"
          className="action-button"
          onClick={() => void handleImport()}
          disabled={importing}
        >
          {importing ? t({ zh: '导入中', en: 'Importing' }) : t({ zh: '导入阵型编辑器', en: 'Import to formation editor' })}
        </button>
      </div>
    </section>
  )
}
