import type { VariantRuleResult } from './variantRuleProjection'

export interface LegalityCheckInput {
  placements: Record<string, string>
  heroSeats: Record<string, number>
  variantRules: VariantRuleResult
  lockedSlots?: string[]
}

export type LegalityViolation =
  | { kind: 'seatConflict'; seat: number; heroes: string[] }
  | { kind: 'bannedChampion'; heroId: string }
  | { kind: 'missingForced'; heroIds: string[] }
  | { kind: 'lockedSlot'; slotId: string }

export interface LegalityResult {
  legal: boolean
  violations: LegalityViolation[]
}

export function checkFormationLegality(input: LegalityCheckInput): LegalityResult {
  const violations: LegalityViolation[] = []
  const { placements, heroSeats, variantRules, lockedSlots } = input

  // Check seat conflicts
  const seatMap = new Map<number, string[]>()
  for (const [, heroId] of Object.entries(placements)) {
    const seat = heroSeats[heroId]
    if (seat !== undefined) {
      const existing = seatMap.get(seat) ?? []
      existing.push(heroId)
      seatMap.set(seat, existing)
    }
  }

  for (const [seat, heroes] of seatMap) {
    if (heroes.length > 1) {
      violations.push({ kind: 'seatConflict', seat, heroes })
    }
  }

  // Check banned champions
  const banList = variantRules.constraints.find((c) => c.kind === 'banList')
  if (banList) {
    for (const heroId of Object.values(placements)) {
      if (banList.heroIds.includes(heroId)) {
        violations.push({ kind: 'bannedChampion', heroId })
      }
    }
  }

  // Check forced champions
  const forceInclude = variantRules.constraints.find((c) => c.kind === 'forceInclude')
  if (forceInclude) {
    const placedHeroes = new Set(Object.values(placements))
    const missing = forceInclude.heroIds.filter((id) => !placedHeroes.has(id))
    if (missing.length > 0) {
      violations.push({ kind: 'missingForced', heroIds: missing })
    }
  }

  // Check locked slots
  if (lockedSlots) {
    for (const slotId of lockedSlots) {
      if (placements[slotId]) {
        violations.push({ kind: 'lockedSlot', slotId })
      }
    }
  }

  return { legal: violations.length === 0, violations }
}
