import type {
  HeroAbilityAmountFunc,
  HeroAbilityDimension,
  HeroAbilitySignal,
  HeroAbilitySource,
  ResolvedHeroAbilityProfile,
} from '../abilities/abilityModel'
import type { HeroAbilityPoolScope } from '../abilities/poolScope'
import type { ResolvedPlannerScenarioModel } from './plannerModel'

export interface PlacementFitScorePart {
  signalKind: HeroAbilitySignal['kind']
  rawEffect: string
  multiplier: number
  active: boolean
  reasonCode:
    | 'global-match'
    | 'carry-self-match'
    | 'adjacent-match'
    | 'adjacent-or-self-match'
    | 'non-adjacent-match'
    | 'within-two-slots-match'
    | 'within-two-slots-or-self-match'
    | 'within-three-slots-match'
    | 'within-three-slots-or-self-match'
    | 'same-column-match'
    | 'same-or-ahead-columns-match'
    | 'adjacent-columns-match'
    | 'ahead-column-match'
    | 'all-ahead-columns-match'
    | 'behind-column-match'
    | 'ahead-two-columns-match'
    | 'behind-two-columns-match'
    | 'all-behind-columns-match'
    | 'same-or-behind-column-match'
    | 'same-or-behind-columns-match'
    | 'self-and-behind-two-columns-match'
    | 'exactly-behind-one-column-match'
    | 'exactly-behind-two-columns-match'
    | 'exactly-behind-three-columns-match'
    | 'front-two-columns-match'
    | 'back-two-columns-match'
    | 'self-and-ahead-and-behind-columns-match'
    | 'rear-most-column-match'
    | 'second-rear-most-column-match'
    | 'third-rear-most-column-match'
    | 'tallest-column-match'
    | 'middle-columns-match'
    | 'slots-with-max-two-adjacent-match'
    | 'tag-match'
    | 'stat-match'
    | 'tag-mismatch'
    | 'stat-mismatch'
    | 'position-mismatch'
    | 'unsupported-composition'
    | 'level-locked'
  source: HeroAbilitySource
  /** signal 的聚合方式（add/mult）；消费层 crit_factor 等需区分时使用。 */
  amountFunc?: HeroAbilityAmountFunc | null
  /** vulnerability 信号的怪物 tag 条件；消费层按场景 enemyTypes 条件性匹配。 */
  monsterTags?: string[] | null
}

export interface AggregatedPool {
  dimension: HeroAbilityDimension
  scope: HeroAbilityPoolScope
  /** pool 内 additive 百分比之和（add/默认 amountFunc 的 signal 贡献）。 */
  addPercent: number
  /** pool 内 multiplicative 因子之积（amountFunc='mult' 的 signal 贡献）。 */
  multFactor: number
  /** (1 + addPercent/100) × multFactor。 */
  poolMultiplier: number
}

export interface PoolAggregateResult {
  heroId: string
  slotId: string
  carryHeroId: string
  carrySlotId: string
  pools: AggregatedPool[]
  /** Π(pools.poolMultiplier)；pool 间乘法。 */
  totalMultiplier: number
  scoreBreakdown: PlacementFitScorePart[]
  warnings: string[]
}

export interface EvaluatePlacementFitInput {
  carryHero: ResolvedHeroAbilityProfile
  carrySlotId: string
  supportHero: ResolvedHeroAbilityProfile
  supportSlotId: string
  scenario: ResolvedPlannerScenarioModel
  placements?: Record<string, string>
  heroesById?: Map<string, ResolvedHeroAbilityProfile>
  /**
   * 按 dimension 过滤；不传时聚合全部维度 signal。可传数组（如 `['damage','crit','vulnerability']`）
   * 一次跑多维度——signal 只迭代一遍，避免对同一批 signal 重复 qualifier 匹配（结构性加速）。
   */
  dimension?: HeroAbilityDimension | readonly HeroAbilityDimension[]
  /**
   * 是否聚合 pools/totalMultiplier；默认 true。
   * false 时跳过 pool 聚合（pools 返回空、totalMultiplier 返回 1），只产 scoreBreakdown——
   * 供 crit/vulnerability 等不消费 pool、直接走 scoreBreakdown→factor 的维度省去死代码计算。
   */
  aggregatePools?: boolean
  /**
   * 动态层数假设（dynamic-stack-multiply 机制用，如蔚出言不逊）；默认 DEFAULT_MANUAL_STACK_COUNT=1000。
   * 仅影响 stacksMultiply=true 且无 stackFunc 的 signal；formation-count 等实时数英雄不受影响。
   */
  manualStackCount?: number | undefined
  /**
   * supportHero 当前等级，用于按 signal.requiredLevel 过滤（等级解锁门控）。
   * 不传 = 无等级限制（向后兼容，不过滤）；由 scoreFormation 从 heroLevels 透传。
   */
  supportLevel?: number
}
