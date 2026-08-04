import type { Dispatch, SetStateAction } from 'react'
import { createInfoStatusMessage } from '../../components/statusMessage'
import type { ScenarioRef } from '../../domain/types'
import type { FormationState, StatusMessage } from './types'
import { pickPreferredSlotId } from './formation-model-helpers'

type BuildFormationBoardActionsOptions = {
  state: FormationState
  setSelectedLayoutId: Dispatch<SetStateAction<string>>
  setActiveMobileSlotId: Dispatch<SetStateAction<string>>
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>
  setScenarioRef: Dispatch<SetStateAction<ScenarioRef | null>>
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>
  setPresetStatus: Dispatch<SetStateAction<StatusMessage | null>>
  bumpEditRevision: () => void
}

export function buildFormationBoardActions({
  state,
  setSelectedLayoutId,
  setActiveMobileSlotId,
  setPlacements,
  setScenarioRef,
  setDraftStatus,
  setPresetStatus,
  bumpEditRevision,
}: BuildFormationBoardActionsOptions) {
  return {
    handleSelectLayout: (layoutId: string) => {
      selectLayout(layoutId, state, setSelectedLayoutId, setActiveMobileSlotId, setPlacements, setScenarioRef, setDraftStatus, setPresetStatus, bumpEditRevision)
    },
    handleAssignChampion: (slotId: string, championId: string) => {
      assignChampion(slotId, championId, setPlacements, setPresetStatus, bumpEditRevision)
    },
    handleClear: () => { clearFormation(setPlacements, setDraftStatus, setPresetStatus, bumpEditRevision) },
  }
}

function selectLayout(
  layoutId: string,
  state: FormationState,
  setSelectedLayoutId: Dispatch<SetStateAction<string>>,
  setActiveMobileSlotId: Dispatch<SetStateAction<string>>,
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>,
  setScenarioRef: Dispatch<SetStateAction<ScenarioRef | null>>,
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>,
  setPresetStatus: Dispatch<SetStateAction<StatusMessage | null>>,
  bumpEditRevision: () => void,
) {
  const nextLayout =
    state.status === 'ready' ? state.formations.find((layout) => layout.id === layoutId) ?? null : null

  setSelectedLayoutId(layoutId)
  setActiveMobileSlotId(pickPreferredSlotId(nextLayout))
  setPlacements({})
  setScenarioRef(null)
  setDraftStatus(createInfoStatusMessage(
    { zh: '已切换布局', en: 'Layout switched' },
    { zh: '当前布局变化后会重新生成最近草稿；旧的场景上下文不会被沿用。', en: 'Switching the layout regenerates the recent draft; the previous scenario context is not carried over.' },
  ))
  setPresetStatus(null)
  bumpEditRevision()
}

function assignChampion(
  slotId: string,
  championId: string,
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>,
  setPresetStatus: Dispatch<SetStateAction<StatusMessage | null>>,
  bumpEditRevision: () => void,
) {
  setPlacements((current) => {
    if (!championId) {
      const next = { ...current }
      delete next[slotId]
      return next
    }

    // 槽位间拖动原子清原 slot——hero 已在别处则清原位，避免同英雄重复占 seat。
    const next = { ...current }
    for (const [existingSlotId, existingHeroId] of Object.entries(next)) {
      if (existingHeroId === championId && existingSlotId !== slotId) {
        delete next[existingSlotId]
      }
    }
    next[slotId] = championId
    return next
  })
  setPresetStatus(null)
  bumpEditRevision()
}

function clearFormation(
  setPlacements: Dispatch<SetStateAction<Record<string, string>>>,
  setDraftStatus: Dispatch<SetStateAction<StatusMessage | null>>,
  setPresetStatus: Dispatch<SetStateAction<StatusMessage | null>>,
  bumpEditRevision: () => void,
) {
  setPlacements({})
  setDraftStatus(createInfoStatusMessage(
    { zh: '当前阵型已清空', en: 'Formation cleared' },
    { zh: '如果保持为空，最近草稿会从浏览器本地一起清理。', en: 'If left empty, the recent draft will also be removed from browser storage.' },
  ))
  setPresetStatus(null)
  bumpEditRevision()
}
