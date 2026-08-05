import { useEffect, type Dispatch, type SetStateAction } from 'react'
import {
  createErrorStatusMessage,
  createInfoStatusMessage,
  createSuccessStatusMessage,
} from '../../components/statusMessage'
import { deleteRecentFormationDraft, saveRecentFormationDraft } from '../../data/formationDraftStore'
import type { ScenarioRef } from '../../domain/types'
import { errorMessageLocaleText, formatDateTime } from './formation-model-helpers'
import { DRAFT_SAVE_DELAY_MS, DRAFT_SCHEMA_VERSION, type FormationState, type ReadyFormationState, type StatusMessage } from './types'

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

export function useFormationDraftPersistence(options: UseFormationDraftPersistenceOptions) {
  const {
    state,
    editRevision,
    isDraftPersistenceArmed,
    placements,
    scenarioRef,
    selectedLayoutId,
    locale,
    setDraftStatus,
  } = options
  useEffect(() => scheduleDraftPersistence({
    state,
    editRevision,
    isDraftPersistenceArmed,
    placements,
    scenarioRef,
    selectedLayoutId,
    setDraftStatus,
  }), [
    state,
    editRevision,
    isDraftPersistenceArmed,
    placements,
    scenarioRef,
    selectedLayoutId,
    locale,
    setDraftStatus,
  ])
}

function scheduleDraftPersistence({
  state,
  editRevision,
  isDraftPersistenceArmed,
  placements,
  scenarioRef,
  selectedLayoutId,
  setDraftStatus,
}: Omit<UseFormationDraftPersistenceOptions, 'locale'>): () => void {
  if (state.status !== 'ready' || !isDraftPersistenceArmed || editRevision === 0 || selectedLayoutId === '') {
    return () => {}
  }

  const timeoutId = window.setTimeout(() => {
    void runPersistDraft({
      placements,
      state,
      selectedLayoutId,
      scenarioRef,
      setDraftStatus,
    })
  }, DRAFT_SAVE_DELAY_MS)

  return () => window.clearTimeout(timeoutId)
}

interface PersistDraftContext {
  placements: Record<string, string>
  state: ReadyFormationState
  selectedLayoutId: string
  scenarioRef: ScenarioRef | null
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
}

async function runPersistDraft({
  placements,
  state,
  selectedLayoutId,
  scenarioRef,
  setDraftStatus,
}: PersistDraftContext): Promise<void> {
  try {
    if (Object.keys(placements).length === 0) {
      await deleteRecentFormationDraft()
      setDraftStatus(createInfoStatusMessage(
        { zh: '最近草稿已清理', en: 'Recent draft cleared' },
        { zh: '当前阵型为空，浏览器本地不会继续保留最近草稿。', en: 'The formation is empty; no recent draft is kept in browser storage.' },
      ))
      return
    }

    const nextDraft = {
      schemaVersion: DRAFT_SCHEMA_VERSION,
      dataVersion: state.dataVersion,
      layoutId: selectedLayoutId,
      updatedAt: new Date().toISOString(),
      scenarioRef,
      placements,
    } as const

    await saveRecentFormationDraft(nextDraft)
    setDraftStatus(
      createSuccessStatusMessage(
        { zh: '最近草稿已自动保存', en: 'Recent draft auto-saved' },
        {
          zh: `${formatDateTime(nextDraft.updatedAt, 'zh-CN')} · 保存在当前浏览器的 IndexedDB。`,
          en: `${formatDateTime(nextDraft.updatedAt, 'en-US')} · Saved to this browser's IndexedDB.`,
        },
      ),
    )
  } catch (error: unknown) {
    setDraftStatus(createErrorStatusMessage(
      { zh: '最近草稿保存失败', en: 'Failed to save recent draft' },
      errorMessageLocaleText(error),
    ))
  }
}
