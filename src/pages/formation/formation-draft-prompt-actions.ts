import type { Dispatch, SetStateAction } from 'react'
import { buildRestoreStatusDetail } from '../../data/formationPersistence'
import { deleteRecentFormationDraft, saveRecentFormationDraft } from '../../data/formationDraftStore'
import {
  createErrorStatusMessage,
  createInfoStatusMessage,
  createSuccessStatusMessage,
} from '../../components/statusMessage'
import type { ScenarioRef } from '../../domain/types'
import { buildRestoredDraftFromPreview, errorMessageLocaleText, pickPreferredSlotId } from './formation-model-helpers'
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

export function buildFormationDraftPromptActions(options: BuildFormationDraftPromptActionsOptions) {
  const { draftPrompt, bumpEditRevision } = options

  function handleRestoreRecentDraft() {
    if (draftPrompt?.kind !== 'restore') {
      return
    }
    applyDraftPromptRestore({ ...options, draftPrompt })
    bumpEditRevision()
  }

  return {
    handleRestoreRecentDraft,
    handleKeepDraftWithoutRestore: () => applyKeepDraftDecision(options),
    handleDiscardRecentDraft: () => void discardRecentDraft(options),
  }
}

interface RestoreDraftContext {
  draftPrompt: Extract<DraftPrompt, { kind: 'restore' }>
  setState: Dispatch<SetStateAction<FormationState>>
  setSelectedLayoutId: Dispatch<SetStateAction<string>>
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>
  setActiveMobileSlotId: Dispatch<SetStateAction<string>>
  setScenarioRef: Dispatch<SetStateAction<ScenarioRef | null>>
  setDraftPrompt: Dispatch<SetStateAction<DraftPrompt | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
}

function applyDraftPromptRestore({
  draftPrompt,
  setState,
  setSelectedLayoutId,
  setPlacements,
  setActiveMobileSlotId,
  setScenarioRef,
  setDraftPrompt,
  setIsDraftPersistenceArmed,
  setDraftStatus,
}: RestoreDraftContext): void {
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
  setDraftStatus(createSuccessStatusMessage(
    { zh: '最近草稿已恢复', en: 'Recent draft restored' },
    buildRestoreStatusDetail(draftPrompt.preview),
  ))
  void saveRecentFormationDraft(restoredDraft)
}

interface KeepDraftDecisionContext {
  draftPrompt: DraftPrompt | null
  setDraftPrompt: Dispatch<SetStateAction<DraftPrompt | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
}

function applyKeepDraftDecision({
  draftPrompt,
  setDraftPrompt,
  setIsDraftPersistenceArmed,
  setDraftStatus,
}: KeepDraftDecisionContext): void {
  const detail: { zh: string; en: string } =
    draftPrompt?.kind === 'restore'
      ? {
          zh: '本次不恢复旧草稿；你后续开始编辑后，新内容会覆盖这条最近草稿。',
          en: "The old draft isn't restored this time; once you start editing, new content will overwrite it.",
        }
      : {
          zh: '本次先保留旧草稿；等你开始编辑当前阵型后，新内容才会覆盖它。',
          en: 'The old draft is kept for now; new content overwrites it only after you start editing.',
        }

  setDraftPrompt(null)
  setIsDraftPersistenceArmed(true)
  setDraftStatus(createInfoStatusMessage(
    { zh: '已保留最近草稿，但本次不恢复', en: 'Recent draft kept, not restored this time' },
    detail,
  ))
}

interface DiscardDraftContext {
  setDraftPrompt: Dispatch<SetStateAction<DraftPrompt | null>>
  setIsDraftPersistenceArmed: Dispatch<SetStateAction<boolean>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
}

async function discardRecentDraft({
  setDraftPrompt,
  setIsDraftPersistenceArmed,
  setDraftStatus,
}: DiscardDraftContext): Promise<void> {
  try {
    await deleteRecentFormationDraft()
    setDraftPrompt(null)
    setIsDraftPersistenceArmed(true)
    setDraftStatus(createInfoStatusMessage(
      { zh: '最近草稿已丢弃', en: 'Recent draft discarded' },
      { zh: '当前页面不会再提示恢复这条旧草稿。', en: 'This page will not prompt to restore this old draft again.' },
    ))
  } catch (error: unknown) {
    setDraftStatus(createErrorStatusMessage(
      { zh: '最近草稿删除失败', en: 'Failed to delete recent draft' },
      errorMessageLocaleText(error),
    ))
  }
}
