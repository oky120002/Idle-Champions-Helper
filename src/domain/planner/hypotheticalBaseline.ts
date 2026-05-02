export interface HypotheticalBaselineInput {
  targetSeat: number
  ownedHeroes: Array<{ heroId: string; seat: number; equipment: Record<string, number> }>
  targetHeroId: string
}

export interface HypotheticalBaselineResult {
  equipment: Record<string, number>
  source: 'same-seat-median' | 'account-median' | 'no-equipment/no-feat'
}

export function computeHypotheticalBaseline(
  input: HypotheticalBaselineInput,
): HypotheticalBaselineResult {
  const { targetSeat, ownedHeroes, targetHeroId } = input

  if (ownedHeroes.length === 0) {
    return { equipment: {}, source: 'no-equipment/no-feat' }
  }

  // Try same-seat median first.
  const sameSeat = ownedHeroes.filter((h) => h.seat === targetSeat && h.heroId !== targetHeroId)
  if (sameSeat.length > 0) {
    return { equipment: computeMedianEquipment(sameSeat), source: 'same-seat-median' }
  }

  // Fallback to account-wide median.
  return { equipment: computeMedianEquipment(ownedHeroes), source: 'account-median' }
}

function computeMedianEquipment(
  heroes: Array<{ equipment: Record<string, number> }>,
): Record<string, number> {
  const allSlots = new Set<string>()
  for (const hero of heroes) {
    for (const slot of Object.keys(hero.equipment)) {
      allSlots.add(slot)
    }
  }

  const result: Record<string, number> = {}
  for (const slot of allSlots) {
    const values = heroes
      .map((h) => h.equipment[slot])
      .filter((v): v is number => v !== undefined)
      .sort((a, b) => a - b)

    if (values.length > 0) {
      const mid = Math.floor(values.length / 2)
      result[slot] = values.length % 2 === 0
        ? Math.round((values[mid - 1]! + values[mid]!) / 2)
        : values[mid]!
    }
  }

  return result
}
