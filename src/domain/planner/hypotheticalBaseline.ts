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

    const median = computeMedian(values)
    if (median !== undefined) {
      result[slot] = median
    }
  }

  return result
}

function computeMedian(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined
  }
  const mid = Math.floor(values.length / 2)
  const lo = values[mid - 1]
  const hi = values[mid]
  if (values.length % 2 === 0) {
    // 偶数个取中位两数均值；math 保证 lo/hi 非空（length>0，偶数 mid>=1）
    if (lo !== undefined && hi !== undefined) {
      return Math.round((lo + hi) / 2)
    }
    return undefined
  }
  // 奇数个取中位数；math 保证 hi 非空（length>0）
  return hi
}
