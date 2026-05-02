export interface ScoringEffect {
  heroId: string
  kind: 'globalDpsMultiplier' | 'adjacentBuff' | 'heroDpsMultiplier' | 'taggedChampionBuff' | 'unsupported'
  value?: number
  targetSlots?: string[]
  rawEffect?: string
  note?: string
}

export interface ScoringInput {
  placements: Record<string, string>
  effects: ScoringEffect[]
  adjacency: Record<string, string[]>
}

export interface ScoringResult {
  score: number
  warnings: string[]
  explanations: string[]
}

export function scoreFormation(input: ScoringInput): ScoringResult {
  const { placements, effects, adjacency } = input
  let score = 1.0
  const warnings: string[] = []
  const explanations: string[] = []

  // Reverse lookup: heroId -> slotId
  const heroToSlot = new Map<string, string>()
  for (const [slotId, heroId] of Object.entries(placements)) {
    heroToSlot.set(heroId, slotId)
  }

  for (const effect of effects) {
    if (effect.kind === 'unsupported') {
      warnings.push(`Unsupported effect: ${effect.rawEffect ?? 'unknown'} — ${effect.note ?? ''}`)
      continue
    }

    const multiplier = effect.value ?? 1.0

    if (effect.kind === 'globalDpsMultiplier') {
      score *= multiplier
      explanations.push(`${effect.heroId}: global DPS x${multiplier}`)
      continue
    }

    if (effect.kind === 'adjacentBuff') {
      const sourceSlot = heroToSlot.get(effect.heroId)
      const adjacentSlots = sourceSlot ? (adjacency[sourceSlot] ?? []) : []
      const targets = effect.targetSlots ?? []

      const hasAdjacentTarget = targets.some((t) => adjacentSlots.includes(t))
      if (hasAdjacentTarget) {
        score *= multiplier
        explanations.push(`${effect.heroId}: adjacent buff x${multiplier} (active)`)
      } else {
        explanations.push(`${effect.heroId}: adjacent buff x${multiplier} (not adjacent — inactive)`)
      }
      continue
    }

    if (effect.kind === 'heroDpsMultiplier') {
      score *= multiplier
      explanations.push(`${effect.heroId}: hero DPS x${multiplier}`)
    }
  }

  return { score, warnings, explanations }
}
