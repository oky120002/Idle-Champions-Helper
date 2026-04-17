import type { Dispatch, SetStateAction } from 'react'
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
  function handleSelectLayout(layoutId: string) {
    const nextLayout =
      state.status === 'ready' ? state.formations.find((layout) => layout.id === layoutId) ?? null : null

    setSelectedLayoutId(layoutId)
    setActiveMobileSlotId(pickPreferredSlotId(nextLayout))
    setPlacements({})
    setScenarioRef(null)
    setDraftStatus({
      tone: 'info',
      title: '已切换布局',
      detail: '当前布局变化后会重新生成最近草稿；旧的场景上下文不会被沿用。',
    })
    setPresetStatus(null)
    bumpEditRevision()
  }

  function handleAssignChampion(slotId: string, championId: string) {
    setPlacements((current) => {
      if (!championId) {
        const next = { ...current }
        delete next[slotId]
        return next
      }

      return {
        ...current,
        [slotId]: championId,
      }
    })
    setPresetStatus(null)
    bumpEditRevision()
  }

  function handleClear() {
    setPlacements({})
    setDraftStatus({
      tone: 'info',
      title: '当前阵型已清空',
      detail: '如果保持为空，最近草稿会从浏览器本地一起清理。',
    })
    setPresetStatus(null)
    bumpEditRevision()
  }

  return {
    handleSelectLayout,
    handleAssignChampion,
    handleClear,
  }
}
