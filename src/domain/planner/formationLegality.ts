import type { VariantRuleResult } from './variantConstraints'

export interface LegalityCheckInput {
  placements: Record<string, string>
  heroSeats: Record<string, number>
  variantRules: VariantRuleResult
}

export type LegalityViolation =
  | { kind: 'seatConflict'; seat: number; heroes: string[] }
  | { kind: 'missingForced'; heroIds: string[] }

export interface LegalityResult {
  legal: boolean
  violations: LegalityViolation[]
}

export function checkFormationLegality(input: LegalityCheckInput): LegalityResult {
  const violations: LegalityViolation[] = []
  const { placements, heroSeats, variantRules } = input

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

  // Check forced champions (all constraints are 'forceInclude' per VariantConstraint type)
  const forceInclude = variantRules.constraints[0]
  if (forceInclude !== undefined) {
    const placedHeroes = new Set(Object.values(placements))
    const missing = forceInclude.heroIds.filter((id) => !placedHeroes.has(id))
    if (missing.length > 0) {
      violations.push({ kind: 'missingForced', heroIds: missing })
    }
  }

  return { legal: violations.length === 0, violations }
}
