import { compareGameNumbers, type GameNumberValue } from '../gameNumber'
import { MAX_AREA, monsterDpsAt, monsterHealthAt } from './monsterStats'

/**
 * 推图层数预估。
 *
 * 估算「能推到第几层」：在 IC 中，击杀怪物需要 BUD ≥ 怪物生命（单次最高伤害 ≥ 血量）；
 * 存活需要英雄有效生命能覆盖怪物伤害。两者取交集：
 *
 * ```
 * killableArea    = max area where BUD ≥ monsterHealthAt(area)
 * survivableArea  = max area where effectiveHealth ≥ monsterDamageAt(area)
 * estimatedArea   = min(killableArea, survivableArea, MAX_AREA)
 * ```
 *
 * 护甲变体追加吞吐量约束：怪物有 `segmentsAt(area)` 段护甲，需逐段击破后才能伤害正常生命。
 * 每段碎甲条件是 `perHitBUD ≥ HP / segments`（`armored-enemies.md` 确认），但这个每段门槛始终 ≤ HP，
 * 永远弱于基础 BUD 约束（BUD ≥ HP），不构成绑定约束。护甲的实际影响是**击杀吞吐量**：
 * 需 `segments + 1` 次 BUD 命中（N 段护甲 + 1 次正常击杀），等效门槛 = `HP × segments`。
 * 段数随层数线性递增（scaling），HP 指数增长，故门槛仍单调递增 → 二分查找适用。
 *
 * 怪物 stats 缩放见 `src/domain/simulator/monsterStats.ts`（数据源 §10.1）。
 *
 * 量纲缺口：`monsterDamageAt` 当前由 `monsterDpsAt` 担任（raw `base_dps` +
 * `dps_growth_rate_curve`）。raw 字段名为 dps，但 `base_speed`(=50) 语义未确认
 * （per-second vs per-hit），survival 的精确判据是单次伤害
 * （incomingDamagePerHit）。故 survival 当前以「怪物伤害随层数缩放」近似——绝对值未校准
 * （继承 BUD 校准边界），精确的单次伤害判据需 base_speed 语义确认后补 monsterDamagePerHitAt。
 *
 * 绝对值边界：carryDps/BUD 绝对值未与真实游戏实测对照，预估的「第 X 层」
 * 依赖 BUD 实测校准才闭环；调用方须向用户标注「未校准」。相对比较（高 BUD → 高层数）保序。
 */

export type AreaBound = 'bud' | 'survival' | 'armor' | 'max-area'

/** 护甲/命中型段数配置（结构化兼容 plannerModel.SegmentConfig；simulator 不依赖 planner 模块）。 */
export interface SegmentConfig {
  segments: number
  scaling?: { additional: number; everyAreas: number }
}

/**
 * 可行性修正参数（结构化兼容 plannerModel.ViabilityContext 的消费子集）。
 * simulator 不导入 planner 模块——仅声明所需字段的结构。
 */
export interface ViabilityModifier {
  /** 护甲段数配置；null = 无护甲。吞吐量等效门槛 HP × segments。 */
  armor: SegmentConfig | null
  /** 命中型段数配置；null = 无命中型。同护甲吞吐量模式（需 N 次命中）。 */
  hitsBased: SegmentConfig | null
  /** 全局伤害修正乘数（0.01 = 减 99%）；null = 无修正。乘进 BUD。 */
  damageModifier: number | null
  /** 敌人伤害倍率（3 = 3x）；null = 无修正。乘进 monsterDpsAt。 */
  enemyDamageMult: number | null
  /** 每秒持续掉血占比（0.025 = 2.5%/s）；null = 无持续掉血。降低有效生命。 */
  healthDrainRate: number | null
}

export interface AreaEstimationInput {
  /** 阵型 BUD（或 carryDps 近似）；BUD ≥ 怪物生命才能击杀。 */
  bud: GameNumberValue
  /**
   * carry 的有效生命（baseHealth × healthLevelCurve × health_pool）。
   * null = 不施加 survival 约束（仅 BUD 绑定）。
   */
  effectiveHealth: GameNumberValue | null
  /** 可行性修正（来自 scenario.viabilityContext）；null/省略 = 普通变体，不施加额外约束。 */
  viability?: ViabilityModifier | null
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

/** 护甲/命中型段数 at area：基础段数 + 层数递增（线性）。 */
function segmentsAt(area: number, config: SegmentConfig): number {
  if (config.scaling) {
    return config.segments + Math.floor((area - 1) / config.scaling.everyAreas) * config.scaling.additional
  }
  return config.segments
}

export function estimateMaxArea(input: AreaEstimationInput): AreaEstimationResult {
  const vc = input.viability
  const damageModifier = vc?.damageModifier
  const effectiveBud = typeof damageModifier === 'number' && damageModifier !== 1
    ? input.bud.mul(damageModifier)
    : input.bud

  const budKillableArea = binarySearchMaxArea(effectiveBud, monsterHealthAt)

  // 段吞吐量约束（护甲 + 命中型）：等效门槛 = HP × totalSegments。
  // 每段门槛 HP/segments 始终 ≤ HP，不构成绑定约束；吞吐量惩罚才是更难的根因。
  // 护甲和命中型可叠加（总命中次数 = armorSeg + hitsSeg）；均 null 时跳过。
  const armorConfig = vc?.armor
  const hitsConfig = vc?.hitsBased
  const segmentKillableArea = (armorConfig != null || hitsConfig != null)
    ? binarySearchMaxArea(effectiveBud, (area) => {
        const total = (armorConfig ? segmentsAt(area, armorConfig) : 0)
          + (hitsConfig ? segmentsAt(area, hitsConfig) : 0)
        return monsterHealthAt(area).mul(Math.max(1, total))
      })
    : null

  const killableArea = segmentKillableArea != null
    ? Math.min(budKillableArea, segmentKillableArea)
    : budKillableArea

  // 存活约束：effectiveHealth ≥ monsterDps × mult × time。持续掉血降低有效生命。
  const enemyDamageMult = vc?.enemyDamageMult
  const drainRate = vc?.healthDrainRate
  const baseHealth = input.effectiveHealth === null
    ? null
    : typeof drainRate === 'number' && drainRate > 0 && drainRate < 1
      ? input.effectiveHealth.mul(1 - drainRate)
      : input.effectiveHealth
  const survivableArea = baseHealth === null
    ? MAX_AREA
    : typeof enemyDamageMult === 'number' && enemyDamageMult !== 1
      ? binarySearchMaxArea(baseHealth, (area) => monsterDpsAt(area).mul(enemyDamageMult))
      : binarySearchMaxArea(baseHealth, monsterDpsAt)

  const area = Math.min(killableArea, survivableArea)

  let boundBy: AreaBound
  if (area >= MAX_AREA) {
    boundBy = 'max-area'
  } else if (killableArea <= survivableArea) {
    boundBy = segmentKillableArea != null && segmentKillableArea < budKillableArea ? 'armor' : 'bud'
  } else {
    boundBy = 'survival'
  }

  return { area, boundBy, killableArea, survivableArea }
}
