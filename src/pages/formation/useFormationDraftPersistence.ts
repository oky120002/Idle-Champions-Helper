import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { deleteRecentFormationDraft, saveRecentFormationDraft } from '../../data/formationDraftStore'
import type { ScenarioRef } from '../../domain/types'
import { formatDateTime, getErrorMessage } from './formation-model-helpers'
import { DRAFT_SAVE_DELAY_MS, DRAFT_SCHEMA_VERSION, type FormationState, type StatusMessage } from './types'

interface UseFormationDraftPersistenceOptions {
  state: FormationState
  editRevision: number
  isDraftPersistenceArmed: boolean
  placements: Record<string, string>
  scenarioRef: ScenarioRef | null
  selectedLayoutId: string
  locale: 'zh-CN' | 'en-US'
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
}

export function useFormationDraftPersistence({
  state,
  editRevision,
  isDraftPersistenceArmed,
  placements,
  scenarioRef,
  selectedLayoutId,
  locale,
  setDraftStatus,
}: UseFormationDraftPersistenceOptions) {
  useEffect(() => {
    if (state.status !== 'ready' || !isDraftPersistenceArmed || editRevision === 0 || !selectedLayoutId) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const persistDraft = async () => {
        try {
          if (Object.keys(placements).length === 0) {
            await deleteRecentFormationDraft()
            setDraftStatus({
              tone: 'info',
              title: '最近草稿已清理',
              detail: '当前阵型为空，浏览器本地不会继续保留最近草稿。',
            })
            return
          }

          const nextDraft = {
            schemaVersion: DRAFT_SCHEMA_VERSION,
            dataVersion: state.dataVersion,
            layoutId: selectedLayoutId,
            scenarioRef,
            placements,
            updatedAt: new Date().toISOString(),
          } as const

          await saveRecentFormationDraft(nextDraft)
          setDraftStatus({
            tone: 'success',
            title: '最近草稿已自动保存',
            detail: `${formatDateTime(nextDraft.updatedAt, locale)} · 保存在当前浏览器的 IndexedDB。`,
          })
        } catch (error: unknown) {
          setDraftStatus({
            tone: 'error',
            title: '最近草稿保存失败',
            detail: getErrorMessage(error),
          })
        }
      }

      void persistDraft()
    }, DRAFT_SAVE_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    editRevision,
    isDraftPersistenceArmed,
    locale,
    placements,
    scenarioRef,
    selectedLayoutId,
    setDraftStatus,
    state,
  ])
}
