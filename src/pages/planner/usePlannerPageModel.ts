import { useCallback, useEffect, useMemo, useState } from 'react'

import { loadCollection } from '../../data/client'
import { beamSearch } from '../../domain/planner/beamSearchRanking'
import { scoreFormation, type ScoringEffect } from '../../domain/planner/steadyStateScoring'
import { formatGameNumber, parseGameNumber } from '../../domain/simulator/gameNumber'
import type { Champion, FormationLayout, ScenarioRef, Variant } from '../../domain/types'
import type { PlannerResultCardProps } from './PlannerResultCard'

interface PlannerCollections {
  variants: Variant[]
  champions: Champion[]
  formations: FormationLayout[]
}

type PlannerLoadState = 'loading' | 'ready' | 'error'

interface PlannerRecommendation {
  result: PlannerResultCardProps | null
  layoutId: string | null
  scenarioRef: ScenarioRef | null
}

function sortSlots(layout: FormationLayout): string[] {
  return [...layout.slots]
    .sort((left, right) => left.row - right.row || left.column - right.column || left.id.localeCompare(right.id))
    .map((slot) => slot.id)
}

function buildAdjacency(layout: FormationLayout): Record<string, string[]> {
  return Object.fromEntries(layout.slots.map((slot) => [slot.id, slot.adjacentSlotIds ?? []]))
}

function contextMatchesVariant(context: ScenarioRef, variant: Variant): boolean {
  if (context.kind === 'variant') {
    return context.id === variant.id
  }

  if (context.kind === 'adventure') {
    return context.id === variant.adventureId
  }

  if (context.kind === 'campaign') {
    return context.id === variant.campaign.id
  }

  return false
}

function findFormationForVariant(formations: FormationLayout[], variant: Variant): FormationLayout | null {
  return formations.find((formation) => {
    const contexts = [
      ...(formation.applicableContexts ?? []),
      ...(formation.sourceContexts ?? []),
    ]

    return contexts.some((context) => contextMatchesVariant(context, variant))
  }) ?? formations[0] ?? null
}

function createRoleEffects(champions: Champion[]): ScoringEffect[] {
  return champions.map((champion) => {
    const roles = new Set(champion.roles.map((role) => role.toLowerCase()))
    const multiplier = roles.has('dps')
      ? 4
      : roles.has('support')
        ? 2.5
        : roles.has('tanking')
          ? 1.5
          : roles.has('healing')
            ? 1.3
            : roles.has('gold')
              ? 1.2
              : 1.05

    return {
      heroId: champion.id,
      kind: 'globalDpsMultiplier',
      value: multiplier,
    }
  })
}

function formatScore(score: number): string {
  const parsed = parseGameNumber(score)
  return parsed.ok ? formatGameNumber(parsed.value) : score.toString()
}

function buildPlannerResult(
  selectedVariant: Variant | null,
  collections: PlannerCollections,
): PlannerRecommendation {
  if (!selectedVariant || collections.champions.length === 0) {
    return { result: null, layoutId: null, scenarioRef: null }
  }

  const formation = findFormationForVariant(collections.formations, selectedVariant)
  if (!formation) {
    return {
      result: {
        score: '0',
        placements: {},
        explanations: [],
        warnings: ['当前没有可用阵型数据。'],
      },
      layoutId: null,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
    }
  }

  const slots = sortSlots(formation)
  const adjacency = buildAdjacency(formation)
  const champions = [...collections.champions].sort((left, right) => left.seat - right.seat || left.id.localeCompare(right.id))
  const championById = new Map(champions.map((champion) => [champion.id, champion]))
  const effectsByHeroId = new Map(createRoleEffects(champions).map((effect) => [effect.heroId, effect]))
  const results = beamSearch({
    heroes: champions.map((champion) => ({ heroId: champion.id, seat: champion.seat })),
    slots,
    adjacency,
    beamWidth: 8,
    scoreFormation: (placements) => {
      const activeEffects = Object.values(placements)
        .map((heroId) => effectsByHeroId.get(heroId))
        .filter((effect): effect is ScoringEffect => Boolean(effect))

      return scoreFormation({ placements, effects: activeEffects, adjacency })
    },
  })
  const top = results[0]

  if (!top) {
    return {
      result: {
        score: '0',
        placements: {},
        explanations: [],
        warnings: ['当前英雄池不足，无法生成推荐。'],
      },
      layoutId: formation.id,
      scenarioRef: { kind: 'variant', id: selectedVariant.id },
    }
  }

  return {
    result: {
      score: formatScore(top.score),
      placements: top.placements,
      explanations: top.explanations.length > 0
        ? top.explanations
        : Object.values(top.placements).map((heroId) => `${championById.get(heroId)?.name.display ?? heroId} 参与基线评分`),
      warnings: top.warnings,
    },
    layoutId: formation.id,
    scenarioRef: { kind: 'variant', id: selectedVariant.id },
  }
}

export function usePlannerPageModel() {
  const [collections, setCollections] = useState<PlannerCollections>({
    variants: [],
    champions: [],
    formations: [],
  })
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<PlannerLoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadPlannerCollections() {
      setLoadState('loading')
      setLoadError(null)

      try {
        const [variants, champions, formations] = await Promise.all([
          loadCollection<Variant>('variants'),
          loadCollection<Champion>('champions'),
          loadCollection<FormationLayout>('formations'),
        ])

        if (!active) return

        setCollections({
          variants: variants.items,
          champions: champions.items,
          formations: formations.items,
        })
        setSelectedVariantId((current) => current ?? variants.items[0]?.id ?? null)
        setLoadState('ready')
      } catch (caught) {
        if (!active) return
        setLoadState('error')
        setLoadError(caught instanceof Error ? caught.message : String(caught))
      }
    }

    void loadPlannerCollections()

    return () => {
      active = false
    }
  }, [])

  const selectedVariant = useMemo(
    () => collections.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [collections.variants, selectedVariantId],
  )
  const plannerRecommendation = useMemo(
    () => buildPlannerResult(selectedVariant, collections),
    [collections, selectedVariant],
  )
  const selectVariantId = useCallback((variantId: string | null) => {
    setSelectedVariantId(variantId)
  }, [])

  return {
    collections,
    loadError,
    loadState,
    plannerRecommendation,
    selectedVariantId,
    selectVariantId,
  }
}
