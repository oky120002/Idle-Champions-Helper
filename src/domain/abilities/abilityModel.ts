import type { AbilityScoreKey, DataCollection, LocalizedText } from '../types'

/**
 * 英雄能力表达层（hero-agnostic）。算法-英雄握手点唯一：HeroAbilityProfile。
 * 本文件不含推荐引擎语义；推荐引擎消费此处类型。
 */

export type HeroAbilityKind =
  | 'globalDpsMultiplier'
  | 'heroDpsMultiplier'
  | 'adjacentBuff'
  | 'taggedChampionBuff'
  | 'globalGoldMultiplier'
  | 'heroGoldMultiplier'
  | 'globalCritChance'
  | 'heroCritChance'
  | 'globalCritDamage'
  | 'heroCritDamage'
  | 'globalHealthMultiplier'
  | 'heroHealthMultiplier'
  | 'damageReduction'
  | 'enemyVulnerability'
  | 'attackSpeedMult'
  | 'cooldownReduction'
  | 'patronPerkMult'

export type HeroAbilitySource =
  | 'official-parsed'
  | 'repo-semantic-patch'
  | 'browser-local-override'
  | 'heuristic-fallback'

export type HeroPositionRelation =
  | 'any'
  | 'self'
  | 'adjacent'
  | 'adjacentOrSelf'
  | 'nonAdjacent'
  | 'withinTwoSlots'
  | 'withinTwoSlotsOrSelf'
  | 'withinThreeSlots'
  | 'withinThreeSlotsOrSelf'
  | 'sameColumn'
  | 'sameOrAheadColumns'
  | 'adjacentColumns'
  | 'aheadColumn'
  | 'allAheadColumns'
  | 'behindColumn'
  | 'aheadTwoColumns'
  | 'behindTwoColumns'
  | 'allBehindColumns'
  | 'sameOrBehindColumn'
  | 'sameOrBehindColumns'
  | 'selfAndBehindTwoColumns'
  | 'exactlyBehindOneColumn'
  | 'exactlyBehindTwoColumns'
  | 'exactlyBehindThreeColumns'
  | 'frontTwoColumns'
  | 'backTwoColumns'
  | 'rearMostColumn'
  | 'secondRearMostColumn'
  | 'thirdRearMostColumn'

export type HeroAbilityAmountFunc = 'add' | 'mult' | 'unknown'
export type HeroComparisonOperator = '>=' | '<=' | '>' | '<' | '=='
export type HeroStatKey = AbilityScoreKey | 'total_ability_score'

export interface HeroStatQualifier {
  stat: HeroStatKey
  operator: HeroComparisonOperator
  value: number
}

export type HeroPredicateAST =
  | { op: 'or'; children: HeroPredicateAST[] }
  | { op: 'and'; children: HeroPredicateAST[] }
  | { op: 'not'; child: HeroPredicateAST }
  | { op: 'tag'; tag: string }
  | { op: 'stat'; stat: HeroStatKey; operator: HeroComparisonOperator; value: number }
  | { op: 'age'; operator: HeroComparisonOperator; value: number }
  | { op: 'heroId'; heroId: string; negate: boolean }
  | { op: 'attackType'; attackType: string; negate: boolean }
  | { op: 'baseAttackCooldown'; operator: HeroComparisonOperator; value: number }
  | { op: 'true' }

export interface HeroQualifier {
  predicate: HeroPredicateAST
}

export interface HeroPositionQualifier {
  relation: HeroPositionRelation
}

export type HeroAbilityUnit = 'percent' | 'flat' | 'boolean'

export interface HeroAbilitySignal {
  kind: HeroAbilityKind
  value: number
  rawEffect: string
  note?: string
  source: HeroAbilitySource
  bonusScaleOfSignal?: HeroAbilitySignal | null
  targetQualifier?: HeroQualifier | null
  formationCountQualifier?: HeroQualifier | null
  positionQualifier?: HeroPositionQualifier | null
  formationCountPositionQualifier?: HeroPositionQualifier | null
  amountFunc?: HeroAbilityAmountFunc | null
  stackFunc?: string | null
  applyManually?: boolean
  stacksMultiply?: boolean | null
  excludeSelf?: boolean
  unit?: HeroAbilityUnit
  /**
   * vulnerability 信号的怪物类型条件（阶段 6）：`|` OR 拆分后的怪物 tag 列表。
   * null = 无条件（对任意怪物生效）；非空 = 仅当场景 enemyTypes 含其中任一 tag 时生效（批判③ 条件性匹配）。
   */
  monsterTags?: string[] | null
}

export interface HeroUnsupportedSignal {
  rawEffect: string
  rawValue: string
  note: string
  source: HeroAbilitySource
}

export interface HeroAbilitySourceBreakdown {
  carrySignals: HeroAbilitySource[]
  supportSignals: HeroAbilitySource[]
  unsupportedSignals: HeroAbilitySource[]
}

export interface HeroAbilityProfile {
  heroId: string
  name: LocalizedText
  seat: number
  roles: string[]
  tags: string[]
  baseAttackDamageTypes: string[]
  baseAttackCooldown: number | null
  age: number | null
  abilityScores: Partial<Record<AbilityScoreKey, number>>
  baseDamage: number
  /**
   * 升级 cost 曲线（来自 champion-details.costCurves，key 统一为 "1"）。
   * levelCurve(level) = rate^level 近似 DPS 增长上界（ponytail，阶段 7 BUD 精确化）。
   */
  costCurves?: Record<string, number> | null
  /** 基础生命值（来自 champion-details.baseHealth）。effectiveHealth 计算用（阶段 5 survival）。 */
  baseHealth: number
  /**
   * 生命值成长曲线（来自 champion-details.healthCurves，key 统一为 "1"）。
   * healthLevelCurve(level) = rate^level 近似生命增长（阶段 5 survival，与 costCurves 同构）。
   */
  healthCurves?: Record<string, number> | null
  carrySignals: HeroAbilitySignal[]
  supportSignals: HeroAbilitySignal[]
  unsupportedSignals: HeroUnsupportedSignal[]
  sourceBreakdown: HeroAbilitySourceBreakdown
  /**
   * 预计算各维度收益（computationMode 按收益排序裁剪候选用）。
   * build 期由 computeHeroGainProfile 算好写入 hero-abilities.json；applyHeroAbilityPatch
   * 应用 override 后重算。稀疏：只列英雄实际有信号的维度，缺省复合时视为 1.0（无加成）。
   */
  gainProfile?: HeroGainProfile
}

export interface HeroAbilityOverridePatch {
  heroId: string
  carrySignals?: Omit<HeroAbilitySignal, 'source'>[]
  supportSignals?: Omit<HeroAbilitySignal, 'source'>[]
  unsupportedSignals?: Omit<HeroUnsupportedSignal, 'source'>[]
}

export type ResolvedHeroAbilityProfile = HeroAbilityProfile

export type HeroAbilityOverrideCollection = DataCollection<HeroAbilityOverridePatch>

export type HeroAbilityDimension =
  | 'damage'
  | 'gold'
  | 'crit'
  | 'survival'
  | 'vulnerability'
  | 'speed'
  | 'cooldown'
  | 'ultimate'
  | 'utility'
  | 'global-buff'

export const DIMENSION_BY_KIND: Record<HeroAbilityKind, HeroAbilityDimension> = {
  globalDpsMultiplier: 'damage',
  heroDpsMultiplier: 'damage',
  adjacentBuff: 'damage',
  taggedChampionBuff: 'damage',
  globalGoldMultiplier: 'gold',
  heroGoldMultiplier: 'gold',
  globalCritChance: 'crit',
  heroCritChance: 'crit',
  globalCritDamage: 'crit',
  heroCritDamage: 'crit',
  globalHealthMultiplier: 'survival',
  heroHealthMultiplier: 'survival',
  damageReduction: 'survival',
  enemyVulnerability: 'vulnerability',
  attackSpeedMult: 'speed',
  cooldownReduction: 'cooldown',
  patronPerkMult: 'global-buff',
}

/**
 * 加成归属 pool：global 影响全局池（所有英雄），hero 仅作用于 carry 自身。
 * 加成聚合时同一 pool 内 additive 百分比相加、multiplicative 因子相乘；global 与 hero pool 间相乘。
 * pool 聚合实现见 src/domain/planner/placementFit.ts evaluatePlacementFit；
 * 加成调研结论见 docs/modules/planner/evolution-plan.md「加成聚合层调研结论」。
 */
export type HeroAbilityPoolScope = 'global' | 'hero'

export const POOL_SCOPE_BY_KIND: Record<HeroAbilityKind, HeroAbilityPoolScope> = {
  globalDpsMultiplier: 'global',
  heroDpsMultiplier: 'hero',
  adjacentBuff: 'hero',
  taggedChampionBuff: 'hero',
  globalGoldMultiplier: 'global',
  heroGoldMultiplier: 'hero',
  globalCritChance: 'global',
  heroCritChance: 'hero',
  globalCritDamage: 'global',
  heroCritDamage: 'hero',
  globalHealthMultiplier: 'global',
  heroHealthMultiplier: 'hero',
  damageReduction: 'global',
  enemyVulnerability: 'global',
  attackSpeedMult: 'hero',
  cooldownReduction: 'global',
  patronPerkMult: 'global',
}

/**
 * 英雄各维度收益（self/support 分层 × 各维度），供计算模式排序裁剪。
 * - self = carrySignals 聚合（英雄当核心时给自己的加成）。
 * - support = supportSignals 聚合（英雄给别人/队伍的加成）。
 * 稀疏：缺省维度视为 1.0（无加成）；复合排序时用 gainOf(profile, layer, dim) ?? 1。
 */
export type HeroGainProfile = {
  self: Partial<Record<HeroAbilityDimension, number>>
  support: Partial<Record<HeroAbilityDimension, number>>
}

/**
 * 预计算英雄各维度收益（上界：假设所有 signal 命中、stack count=1、忽略 qualifier）。
 * 用于 computationMode 按收益排序裁剪候选，减少 beam search 评分次数。
 * 数学须与 placementFit.ts 的 pool 聚合一致：add/默认 → addPercent 相加，
 * mult → multFactor 相乘，poolMultiplier = (1+addPercent/100)×multFactor。
 * 精确限制匹配仍在 scoreFormation 做——裁剪决定「试不试谁」，不决定「算成多少」。
 */
export function computeHeroGainProfile(
  carrySignals: HeroAbilitySignal[],
  supportSignals: HeroAbilitySignal[],
): HeroGainProfile {
  return {
    self: aggregateGainByDimension(carrySignals),
    support: aggregateGainByDimension(supportSignals),
  }
}

function aggregateGainByDimension(
  signals: HeroAbilitySignal[],
): Partial<Record<HeroAbilityDimension, number>> {
  const byDim = new Map<HeroAbilityDimension, { addPercent: number; multFactor: number }>()
  for (const signal of signals) {
    const dimension = DIMENSION_BY_KIND[signal.kind]
    if (!dimension) continue
    const entry = byDim.get(dimension) ?? { addPercent: 0, multFactor: 1 }
    if (signal.amountFunc === 'mult') {
      entry.multFactor *= 1 + signal.value / 100
    } else {
      entry.addPercent += signal.value
    }
    byDim.set(dimension, entry)
  }
  const result: Partial<Record<HeroAbilityDimension, number>> = {}
  for (const [dimension, { addPercent, multFactor }] of byDim) {
    result[dimension] = (1 + addPercent / 100) * multFactor
  }
  return result
}

export function applyHeroAbilityPatch(
  hero: ResolvedHeroAbilityProfile,
  patch: HeroAbilityOverridePatch | undefined,
  source: HeroAbilitySource,
): ResolvedHeroAbilityProfile {
  if (!patch) {
    return hero
  }

  const carrySignals = patch.carrySignals
    ? patch.carrySignals.map((signal) => ({ ...signal, source }))
    : hero.carrySignals
  const supportSignals = patch.supportSignals
    ? patch.supportSignals.map((signal) => ({ ...signal, source }))
    : hero.supportSignals
  const unsupportedSignals = patch.unsupportedSignals
    ? patch.unsupportedSignals.map((signal) => ({ ...signal, source }))
    : hero.unsupportedSignals

  return {
    ...hero,
    carrySignals,
    supportSignals,
    unsupportedSignals,
    // override 改了 signals，gainProfile 必须重算保持一致。
    gainProfile: computeHeroGainProfile(carrySignals, supportSignals),
    sourceBreakdown: {
      carrySignals: patch.carrySignals ? patch.carrySignals.map(() => source) : hero.sourceBreakdown.carrySignals,
      supportSignals: patch.supportSignals ? patch.supportSignals.map(() => source) : hero.sourceBreakdown.supportSignals,
      unsupportedSignals: patch.unsupportedSignals ? patch.unsupportedSignals.map(() => source) : hero.sourceBreakdown.unsupportedSignals,
    },
  }
}

export function resolveHeroAbilityProfiles(
  officialHeroes: HeroAbilityProfile[],
  repoOverrideItems: HeroAbilityOverridePatch[],
  localOverrideItems: HeroAbilityOverridePatch[],
): ResolvedHeroAbilityProfile[] {
  const repoOverridesByHeroId = new Map(repoOverrideItems.map((item) => [item.heroId, item]))
  const localOverridesByHeroId = new Map(localOverrideItems.map((item) => [item.heroId, item]))

  return officialHeroes.map((hero) => {
    const withRepoOverrides = applyHeroAbilityPatch(
      hero,
      repoOverridesByHeroId.get(hero.heroId),
      'repo-semantic-patch',
    )

    return applyHeroAbilityPatch(
      withRepoOverrides,
      localOverridesByHeroId.get(hero.heroId),
      'browser-local-override',
    )
  })
}
