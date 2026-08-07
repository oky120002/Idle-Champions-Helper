import {
  compareGameNumbers,
  divideGameNumbers,
  multiplyGameNumbers,
  powerGameNumber,
  subtractGameNumbers,
  toGameNumber,
  type GameNumberValue,
} from '../gameNumber'

const MAX_SEARCH_LEVEL = 10000
const DEFAULT_COST_CURVE_RATE = 1.06

/** 从 costCurves 提取升级增长率（key "1"，缺失回退 1.06）。 */
function resolveRate(costCurves: Record<string, number> | null | undefined): number {
  const rate = costCurves?.['1'] ?? (costCurves ? Object.values(costCurves)[0] : undefined)
  return typeof rate === 'number' && rate > 0 ? rate : DEFAULT_COST_CURVE_RATE
}

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

/**
 * 给定金币预算和英雄升级参数，二分搜索最高可达等级。
 *
 * 输入真实的 baseCost + costCurves（来自 champion-details），金币为 GameNumberValue（可超大数）。
 * 输出 0~MAX_SEARCH_LEVEL 的整数等级。
 */
export function computeAffordableLevel(
  baseCost: number,
  costCurves: Record<string, number> | null | undefined,
  goldBudget: GameNumberValue,
): number {
  const rate = resolveRate(costCurves)
  let lo = 0
  let hi = MAX_SEARCH_LEVEL
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const cost = computeCumulativeLevelCost(baseCost, rate, mid)
    if (compareGameNumbers(cost, goldBudget) <= 0) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return lo
}

/**
 * 给定全局等级，对所有英雄算升到该等级的累计费用，取最大值。
 *
 * 用于等级模式反算金币传给计算器——用户输入统一等级后，用最贵英雄的金币需求作为传入值，
 * 确保计算器收到的是保守上限。
 */
export function computeMaxGoldForLevel(
  heroes: ReadonlyArray<{ baseCost: number; costCurves: Record<string, number> | null | undefined }>,
  level: number,
): GameNumberValue {
  if (level <= 0) return toGameNumber(0)
  let max = toGameNumber(0)
  for (const hero of heroes) {
    const rate = resolveRate(hero.costCurves)
    const cost = computeCumulativeLevelCost(hero.baseCost, rate, level)
    if (compareGameNumbers(cost, max) > 0) {
      max = cost
    }
  }
  return max
}
