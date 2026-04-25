import { buildRestoreStatusDetail } from '../../data/formationPersistence'
import { deleteRecentFormationDraft, saveRecentFormationDraft } from '../../data/formationDraftStore'
import type { Dispatch, SetStateAction } from 'react'
import {
  createErrorStatusMessage,
  createInfoStatusMessage,
  createSuccessStatusMessage,
} from '../../components/statusMessage'
import type { ScenarioRef } from '../../domain/types'
import { buildRestoredDraftFromPreview, getErrorMessage, pickPreferredSlotId } from './formation-model-helpers'
import type { DraftPrompt, FormationState, StatusMessage } from './types'

type BuildFormationDraftPromptActionsOptions = {
  draftPrompt: DraftPrompt | null
  setState: Dispatch<SetStateAction<FormationState>>
  setSelectedLayoutId: Dispatch<SetStateAction<string>>
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>
  setActiveMobileSlotId: Dispatch<SetStateAction<string>>
  setScenarioRef: Dispatch<SetStateAction<ScenarioRef | null>>
  setDraftPrompt: Dispatch<SetStateAction<DraftPrompt | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
  bumpEditRevision: () => void
}

export function buildFormationDraftPromptActions({
  draftPrompt,
  setState,
  setSelectedLayoutId,
  setPlacements,
  setActiveMobileSlotId,
  setScenarioRef,
  setDraftPrompt,
  setIsDraftPersistenceArmed,
  setDraftStatus,
  bumpEditRevision,
}: BuildFormationDraftPromptActionsOptions) {
  function handleRestoreRecentDraft() {
    if (draftPrompt?.kind !== 'restore') {
      return
    }

    const restoredDraft = buildRestoredDraftFromPreview(draftPrompt.preview)

    setState({
      status: 'ready',
      dataVersion: draftPrompt.preview.dataVersion,
      formations: draftPrompt.preview.formations,
      champions: draftPrompt.preview.champions,
    })
    setSelectedLayoutId(restoredDraft.layoutId)
    setPlacements(restoredDraft.placements)
    setActiveMobileSlotId(
      pickPreferredSlotId(
        draftPrompt.preview.formations.find((layout) => layout.id === restoredDraft.layoutId) ?? null,
        restoredDraft.placements,
      ),
    )
    setScenarioRef(restoredDraft.scenarioRef)
    setDraftPrompt(null)
    setIsDraftPersistenceArmed(true)
    setDraftStatus(createSuccessStatusMessage('最近草稿已恢复', buildRestoreStatusDetail(draftPrompt.preview)))
    void saveRecentFormationDraft(restoredDraft)
    bumpEditRevision()
  }

  function handleKeepDraftWithoutRestore() {
    const detail =
      draftPrompt?.kind === 'restore'
        ? '本次不恢复旧草稿；你后续开始编辑后，新内容会覆盖这条最近草稿。'
        : '本次先保留旧草稿；等你开始编辑当前阵型后，新内容才会覆盖它。'

    setDraftPrompt(null)
    setIsDraftPersistenceArmed(true)
    setDraftStatus(createInfoStatusMessage('已保留最近草稿，但本次不恢复', detail))
  }

  function handleDiscardRecentDraft() {
    const discardDraft = async () => {
      try {
        await deleteRecentFormationDraft()
        setDraftPrompt(null)
        setIsDraftPersistenceArmed(true)
        setDraftStatus(createInfoStatusMessage('最近草稿已丢弃', '当前页面不会再提示恢复这条旧草稿。'))
      } catch (error: unknown) {
        setDraftStatus(createErrorStatusMessage('最近草稿删除失败', getErrorMessage(error)))
      }
    }

    void discardDraft()
  }

  return {
    handleRestoreRecentDraft,
    handleKeepDraftWithoutRestore,
    handleDiscardRecentDraft,
  }
}
