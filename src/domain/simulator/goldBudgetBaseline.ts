import { toGameNumber, powerGameNumber, multiplyGameNumbers, divideGameNumbers, subtractGameNumbers, type GameNumberValue } from '../gameNumber'

/**
 * 累计升级费用：英雄从 level 0 升到 targetLevel 需要的总金币。
 *
 * 公式来自社区（r/idlechampions）：`baseCost × (rate^X - 1) / (rate - 1)`（等比数列求和）。
 * baseCost = 首次升级费用，rate = costCurves["1"]（per-hero 指数增长率）。
 */
export function computeCumulativeLevelCost(baseCost: number, rate: number, targetLevel: number): GameNumberValue {
  if (targetLevel <= 0) return toGameNumber(0)
  if (rate <= 1) return toGameNumber(baseCost * targetLevel)
  // 减法在 decimal.js 内完成（JS number 的 rate-1 有浮点误差）
  const rateGn = toGameNumber(rate)
  const ratePow = powerGameNumber(rateGn, targetLevel)
  return multiplyGameNumbers(
    toGameNumber(baseCost),
    divideGameNumbers(subtractGameNumbers(ratePow, toGameNumber(1)), subtractGameNumbers(rateGn, toGameNumber(1))),
  )
}

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
