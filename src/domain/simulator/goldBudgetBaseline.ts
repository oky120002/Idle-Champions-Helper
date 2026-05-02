export interface GoldBudgetInput {
  costCurve: (level: number) => number
  goldBudget: number
  specializationBaseline: number
}

export interface GoldBudgetResult {
  affordableLevel: number
  belowBaseline: boolean
}

const MAX_SEARCH_LEVEL = 10000

export function computeGoldBudgetBaseline(input: GoldBudgetInput): GoldBudgetResult {
  const { costCurve, goldBudget, specializationBaseline } = input

  if (goldBudget <= 0) {
    return { affordableLevel: 0, belowBaseline: specializationBaseline > 0 }
  }

  // Binary search for the highest affordable level.
  let lo = 0
  let hi = MAX_SEARCH_LEVEL

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const cost = costCurve(mid)

    if (cost <= goldBudget) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }

  const affordableLevel = lo
  const belowBaseline = affordableLevel < specializationBaseline

  return { affordableLevel, belowBaseline }
}
