import type { GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'
import { MAX_AREA, monsterDpsAt, monsterHealthAt } from '../simulator/monsterStats'

/**
 * 推图层数预估（阶段 10.2）。
 *
 * 估算「能推到第几层」：在 IC 中，击杀怪物需要 BUD ≥ 怪物生命（单次最高伤害 ≥ 血量），
 * 存活需要 effectiveHealth ≥ 怪物单次伤害。两者取交集：
 *
 * ```
 * killableArea    = max area where BUD ≥ monsterHealthAt(area)
 * survivableArea  = max area where effectiveHealth ≥ monsterDpsAt(area)
 * estimatedArea   = min(killableArea, survivableArea, MAX_AREA)
 * ```
 *
 * 怪物 stats 缩放见 `src/domain/simulator/monsterStats.ts`（数据源 §10.1）。
 *
 * 绝对值边界（第六轮审计）：carryDps/BUD 绝对值未与真实游戏实测对照，预估的「第 X 层」
 * 依赖阶段 7.5 BUD 实测校准才闭环；调用方须向用户标注「未校准」。相对比较（高 BUD → 高层数）保序。
 */

export type AreaBound = 'bud' | 'survival' | 'max-area'

export interface AreaEstimationInput {
  /** 阵型 BUD（或 carryDps 近似）；BUD ≥ 怪物生命才能击杀。 */
  bud: GameNumberValue
  /**
   * carry 的有效生命（baseHealth × healthLevelCurve × health_pool）。
   * null = 不施加 survival 约束（仅 BUD 绑定）。
   */
  effectiveHealth: GameNumberValue | null
}

export interface AreaEstimationResult {
  /** 预估可推进的最大层数。 */
  area: number
  /** 绑定约束：哪个限制先触发。 */
  boundBy: AreaBound
  /** BUD 能击杀到的最大层数（未计 survival）。 */
  killableArea: number
  /** survival 能撑到的最大层数（effectiveHealth 为 null 时 = MAX_AREA）。 */
  survivableArea: number
}

/**
 * 二分查找 max area where `capacity ≥ statAt(area)`，area ∈ [1, MAX_AREA]。
 * statAt 单调递增（怪物 stats 随层数只增不减）。
 */
function binarySearchMaxArea(
  capacity: GameNumberValue,
  statAt: (area: number) => GameNumberValue,
): number {
  // capacity 不足以击杀 area 1 → 1（area 1 是起点，无法再低）。
  if (compareGameNumbers(capacity, statAt(1)) < 0) {
    return 1
  }
  let lo = 1
  let hi = MAX_AREA
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2)
    if (compareGameNumbers(capacity, statAt(mid)) >= 0) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return lo
}

export function estimateMaxArea(input: AreaEstimationInput): AreaEstimationResult {
  const killableArea = binarySearchMaxArea(input.bud, monsterHealthAt)

  const survivableArea = input.effectiveHealth === null
    ? MAX_AREA
    : binarySearchMaxArea(input.effectiveHealth, monsterDpsAt)

  const area = Math.min(killableArea, survivableArea)

  let boundBy: AreaBound
  if (area >= MAX_AREA) {
    boundBy = 'max-area'
  } else if (killableArea <= survivableArea) {
    boundBy = 'bud'
  } else {
    boundBy = 'survival'
  }

  return { area, boundBy, killableArea, survivableArea }
}
