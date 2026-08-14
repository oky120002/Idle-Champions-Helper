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
  function handleSelectLayout(layoutId: string) {
    const nextLayout =
      state.status === 'ready' ? state.formations.find((layout) => layout.id === layoutId) ?? null : null

    setSelectedLayoutId(layoutId)
    setActiveMobileSlotId(pickPreferredSlotId(nextLayout))
    setPlacements({})
    setScenarioRef(null)
    setDraftStatus(createInfoStatusMessage(
      { key: '已切换布局' },
      { key: '当前布局变化后会重新生成最近草稿；旧的场景上下文不会被沿用。' },
    ))
    setPresetStatus(null)
    bumpEditRevision()
  }

  function handleAssignChampion(slotId: string, championId: string) {
    setPlacements((current) => {
      if (championId === '') {
        return removePlacementEntry(current, slotId)
      }
      // 槽位间拖动原子清原 slot——hero 已在别处则清原位，避免同英雄重复占 seat。
      return mergePlacementEntry(current, slotId, championId)
    })
    setPresetStatus(null)
    bumpEditRevision()
  }

  function handleClear() {
    setPlacements({})
    setDraftStatus(createInfoStatusMessage(
      { key: '当前阵型已清空' },
      { key: '如果保持为空，最近草稿会从浏览器本地一起清理。' },
    ))
    setPresetStatus(null)
    bumpEditRevision()
  }

  return {
    handleSelectLayout,
    handleAssignChampion,
    handleClear,
  }
}

function removePlacementEntry(
  placements: Record<string, string>,
  slotId: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(placements).filter(([key]) => key !== slotId),
  )
}

function mergePlacementEntry(
  placements: Record<string, string>,
  slotId: string,
  championId: string,
): Record<string, string> {
  return Object.fromEntries([
    ...Object.entries(placements).filter(
      ([existingSlotId, existingHeroId]) =>
        !(existingHeroId === championId && existingSlotId !== slotId),
    ),
    [slotId, championId],
  ])
}
