import { useMemo } from 'react'
import type { AppLocale } from '../../app/i18n'
import { buildOrderedChampionsFromPlacements } from '../../domain/championPlacement'
import {
  formatSeatLabel,
  getLocalizedTextPair,
  getPrimaryLocalizedText,
} from '../../domain/localizedText'
import {
  getFormationBoardMetrics,
  getFormationLayoutContextSummary,
  getFormationLayoutLabel,
} from '../../domain/formationLayout'
import type { Champion, PresetPriority } from '../../domain/types'
import { findSeatConflicts } from '../../rules/seat'
import { matchesLayoutContextKind, matchesLayoutSearch } from './formation-model-helpers'
import type {
  DraftPrompt,
  FormationPageTranslator,
  FormationState,
  LayoutFilterKind,
  PresetFormState,
  SelectedChampionPlacement,
} from './types'

interface UseFormationPageDerivedOptions {
  state: FormationState
  selectedLayoutId: string
  placements: Record<string, string>
  draftPrompt: DraftPrompt | null
  locale: AppLocale
  t: FormationPageTranslator
  layoutSearch: string
  selectedContextKind: LayoutFilterKind
  activeMobileSlotId: string
  isSavingPreset: boolean
  presetForm: PresetFormState
}

export function useFormationPageDerived({
  state,
  selectedLayoutId,
  placements,
  draftPrompt,
  locale,
  t,
  layoutSearch,
  selectedContextKind,
  activeMobileSlotId,
  isSavingPreset,
  presetForm,
}: UseFormationPageDerivedOptions) {
  const selectedLayout = useMemo(
    () =>
      state.status === 'ready'
        ? state.formations.find((layout) => layout.id === selectedLayoutId) ?? state.formations[0] ?? null
        : null,
    [selectedLayoutId, state],
  )

  const selectedLayoutLabel = selectedLayout ? getFormationLayoutLabel(selectedLayout, locale) : null
  const selectedLayoutContextSummary = selectedLayout
    ? getFormationLayoutContextSummary(selectedLayout, locale)
    : null

  const formationBoardStyle = useMemo(() => {
    if (!selectedLayout) {
      return undefined
    }

    const metrics = getFormationBoardMetrics(selectedLayout)

    return {
      gridTemplateColumns: `repeat(${metrics.columnCount}, minmax(0, 1fr))`,
      width: `${metrics.widthPx}px`,
      minWidth: `${metrics.minWidthPx}px`,
    }
  }, [selectedLayout])

  const filteredLayouts = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return state.formations.filter(
      (layout) => matchesLayoutContextKind(layout, selectedContextKind) && matchesLayoutSearch(layout, layoutSearch),
    )
  }, [layoutSearch, selectedContextKind, state])

  const isSelectedLayoutVisible = selectedLayout
    ? filteredLayouts.some((layout) => layout.id === selectedLayout.id)
    : false

  const championOptions = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    return [...state.champions].sort(
      (left, right) =>
        left.seat - right.seat ||
        getPrimaryLocalizedText(left.name, locale).localeCompare(getPrimaryLocalizedText(right.name, locale)) ||
        left.name.original.localeCompare(right.name.original),
    )
  }, [locale, state])

  const championById = useMemo(() => {
    if (state.status !== 'ready') {
      return new Map<string, Champion>()
    }

    return new Map(state.champions.map((champion) => [champion.id, champion]))
  }, [state])

  const selectedChampions = useMemo<SelectedChampionPlacement[]>(() => {
    if (state.status !== 'ready' || !selectedLayout) {
      return []
    }

    return selectedLayout.slots
      .map((slot) => {
        const championId = placements[slot.id]

        if (!championId) {
          return null
        }

        const champion = championById.get(championId) ?? null

        if (!champion) {
          return null
        }

        return {
          slotId: slot.id,
          champion,
        }
      })
      .filter((item): item is SelectedChampionPlacement => item !== null)
  }, [championById, placements, selectedLayout, state])

  const activeMobileSlot =
    selectedLayout?.slots.find((slot) => slot.id === activeMobileSlotId) ?? selectedLayout?.slots[0] ?? null
  const activeMobileChampionId = activeMobileSlot ? placements[activeMobileSlot.id] ?? '' : ''
  const activeMobileChampion = activeMobileChampionId ? championById.get(activeMobileChampionId) ?? null : null

  const conflictingSeats = useMemo(
    () => findSeatConflicts(selectedChampions.map((item) => item.champion.seat)),
    [selectedChampions],
  )

  const draftPromptChampions = useMemo(() => {
    if (!draftPrompt || draftPrompt.kind !== 'restore') {
      return []
    }

    return buildOrderedChampionsFromPlacements(
      draftPrompt.preview.placements,
      draftPrompt.preview.champions,
    )
  }, [draftPrompt])

  const canSavePreset =
    selectedChampions.length > 0 && presetForm.name.trim().length > 0 && !isSavingPreset

  function getChampionOptionLabel(champion: Champion): string {
    return `${formatSeatLabel(champion.seat, locale)} · ${getLocalizedTextPair(champion.name, locale)}`
  }

  function getPresetPriorityLabel(priority: PresetPriority): string {
    if (priority === 'high') {
      return t({ zh: '高优先', en: 'High' })
    }

    if (priority === 'low') {
      return t({ zh: '备用', en: 'Fallback' })
    }

    return t({ zh: '常用', en: 'Regular' })
  }

  function getLayoutFilterLabel(kind: LayoutFilterKind): string {
    if (kind === 'campaign') {
      return t({ zh: '战役', en: 'Campaign' })
    }

    if (kind === 'adventure') {
      return t({ zh: '冒险', en: 'Adventure' })
    }

    if (kind === 'variant') {
      return t({ zh: '变体', en: 'Variant' })
    }

    return t({ zh: '全部', en: 'All' })
  }

  return {
    selectedLayout,
    selectedLayoutLabel,
    selectedLayoutContextSummary,
    formationBoardStyle,
    filteredLayouts,
    isSelectedLayoutVisible,
    championOptions,
    championById,
    selectedChampions,
    activeMobileSlot,
    activeMobileChampionId,
    activeMobileChampion,
    conflictingSeats,
    draftPromptChampions,
    canSavePreset,
    getChampionOptionLabel,
    getPresetPriorityLabel,
    getLayoutFilterLabel,
  }
}
