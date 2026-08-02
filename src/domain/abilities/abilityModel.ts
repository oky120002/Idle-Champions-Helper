import type { AbilityScoreKey, DataCollection, LocalizedText } from '../types'

/**
 * 英雄能力表达层（hero-agnostic）。算法-英雄握手点唯一：HeroAbilityProfile。
 * 本文件不含推荐引擎语义；推荐引擎消费此处类型。
 */

export type HeroAbilityKind =
  | 'globalDpsMultiplier'
  | 'heroDpsMultiplier'
  | 'globalGoldMultiplier'
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
  | 'selfAndAheadAndBehindColumns'
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
  // GetUpgradeUnlocked(N)：存档依赖 global 谓词——upgrade N 属唯一 owner 英雄，解锁 = owner 等级 >= requiredLevel。
  // build 期从 champion-details upgrades 解析 ownerHeroId(=self) + requiredLevel 烘进节点；runtime 查 ownedLevels。
  // ownerHeroId/requiredLevel undefined = build 未解析（跨英雄引用/缺数据）→ eval false。
  | { op: 'upgradeUnlocked'; upgradeId: string; ownerHeroId?: string; requiredLevel?: number }
  // GetUpgradePurchased(N)：存档依赖 global 谓词——N 是否购买。build 期解析 ownerHeroId(self) + requiredLevel +
  // isSpecialization（specializationName 非空）。spec → N ∈ owner.specializations；regular → owner 等级 >= reqLvl。
  | { op: 'upgradePurchased'; upgradeId: string; ownerHeroId?: string; requiredLevel?: number; isSpecialization?: boolean }
  // GetFeatEquipped(N)：存档依赖 per-hero 谓词——被评估英雄是否装备 feat N。runtime 查 equippedFeatIds。
  // feat 是 hero-specific（N 属唯一英雄），只有 owner 英雄能装；未装备/无存档 → false。
  | { op: 'featEquipped'; featId: string }
  // is_alive：runtime 战斗状态（英雄是否存活）。planner 是稳态模型（不建模战斗死亡）→ eval 恒 true；
  // !is_alive 恒 false。hero 119 `!is_alive || is_undead || HasTag(undead)` 化简为 is_undead || undead。
  | { op: 'isAlive' }
  // EligibleForPatron(current)：per-hero 账号状态——被评估英雄是否符合当前 patron 资格。
  // runtime 查 hero.eligiblePatronIds 是否含 ownedSaveContext.currentPatronId（0=自由玩，全 eligible）。
  | { op: 'eligibleForPatron' }

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
   * vulnerability 信号的怪物类型条件：`|` OR 拆分后的怪物 tag 列表。
   * null = 无条件（对任意怪物生效）；非空 = 仅当场景 enemyTypes 含其中任一 tag 时生效。
   */
  monsterTags?: string[] | null
  /**
   * 解锁等级（来自 champion-details upgrade 的 required_level）：该 signal 首次生效所需英雄等级。
   * null/undefined = 无等级限制（向后兼容）；消费侧 evaluatePlacementFit 按 supportLevel 过滤。
   */
  requiredLevel?: number | null
  /**
   * 源 upgrade id（champion-details upgrades[].id）：产生该 signal 的 upgrade。
   * direct signal（bonusScaleOfSignal==null）= 其源 upgrade；wrapper signal = wrapper 自身源 upgrade（非 target）。
   * null/undefined = 非 upgrade 源（loot/feat/legendary）或无 id upgrade。runtime 装备 buff_upgrade 注入按
   * target upgradeId 反查 direct base signal，构建 wrapper 挂上去（Phase B 方向 A 阶段 2）。
   */
  upgradeId?: string | null
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
   * 英雄 innate base 暴击 %（来自 set_base_crit_chance SET，覆盖游戏全局默认 2.5%）。
   * null/undefined = 用默认 2.5%（critFactor 归一）。非位置信号，build 期提取。
   */
  baseCritChancePercent?: number | null
  /**
   * 升级 cost 曲线（来自 champion-details.costCurves，key 统一为 "1"）。
   * levelCurve(level) = rate^level 近似 DPS 增长上界（ponytail，BUD 精确化）。
   */
  costCurves?: Record<string, number> | null
  /** 基础生命值（来自 champion-details.baseHealth）。effectiveHealth 计算用。 */
  baseHealth: number
  /**
   * 生命值成长曲线（来自 champion-details.healthCurves，key 统一为 "1"）。
   * healthLevelCurve(level) = rate^level 近似生命增长。
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
  /**
   * 该英雄符合资格的 patron id 列表（来自 champion-details summary.patronEligibility.eligiblePatronIds）。
   * EligibleForPatron(current) 查此列表；null/undefined = 无数据（保守视为不符合）。
   */
  eligiblePatronIds?: string[] | null
  /**
   * 运行时注入的存档上下文（OwnedHero 派生）；build 期 undefined（不进 hero-abilities.json）。
   * evaluateFormation/buildPlannerRecommendation 从 profileSnapshot 注入，供存档依赖谓词
   *（GetUpgradeUnlocked 等）求值。缺省 = 未拥有/未导入存档 → 谓词恒 false。
   */
  ownedSaveContext?: HeroOwnedSaveContext
}

/**
 * 存档派生的上下文（runtime 注入，非 build 期数据）。混合 global + per-hero 数据：
 * - ownedLevels / ownedSpecializations：formation-global（所有 profile 共享同一 ref），按 ownerHeroId 查。
 *   GetUpgradeUnlocked / GetUpgradePurchased 是 global 谓词（upgrade 属唯一 owner，与被评估英雄无关）。
 * - equippedFeatIds：per-hero（被评估英雄的 feats），GetFeatEquipped 查此集。
 */
export interface HeroOwnedSaveContext {
  ownedLevels: Map<string, number>
  ownedSpecializations: Map<string, Set<string>>
  equippedFeatIds: Set<string>
  /** 当前 patron id（profileSnapshot.activeContext.patronId；0=自由玩，null=未导入存档）。EligibleForPatron 查。 */
  currentPatronId: number | null
}

export interface HeroAbilityOverridePatch {
  heroId: string
  carrySignals?: Omit<HeroAbilitySignal, 'source'>[]
  supportSignals?: Omit<HeroAbilitySignal, 'source'>[]
  unsupportedSignals?: Omit<HeroUnsupportedSignal, 'source'>[]
}

/**
 * signal 归属的信号列表：自增益（仅 supportHero===carryHero 时计入）vs 支援（支援任意 carry 时计入）。
 * build 期由 resolveBucket 判定（effect.targets 位置定向关系）；catalog 携带此字段供 runtime 路由。
 * 消费侧 collectSignals 按 supportHero 是否等于 carryHero 区分读取（见 placementFit.ts）。
 */
export type SignalBucket = 'carrySignals' | 'supportSignals'

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

export const DIMENSION_BY_KIND: Record<HeroAbilityKind, HeroAbilityDimension> = {
  globalDpsMultiplier: 'damage',
  heroDpsMultiplier: 'damage',
  globalGoldMultiplier: 'gold',
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
}

/**
 * 加成归属 pool：global 影响全局池（所有英雄），hero 仅作用于 carry 自身。
 * 加成聚合时同一 pool 内 additive 百分比相加、multiplicative 因子相乘；global 与 hero pool 间相乘。
 * pool 聚合实现见 src/domain/planner/placementFit.ts evaluatePlacementFit；
 * 加成聚合与 DPS 公式见 docs/specs/modules/planner/simulator.md「加成聚合与 DPS 公式」。
 */
export type HeroAbilityPoolScope = 'global' | 'hero'

export const POOL_SCOPE_BY_KIND: Record<HeroAbilityKind, HeroAbilityPoolScope> = {
  globalDpsMultiplier: 'global',
  heroDpsMultiplier: 'hero',
  globalGoldMultiplier: 'global',
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
    // stacksMultiply + 无 stackFunc（短路分支）：实际评分走 multFactor (1+value/100)^count，base 仅依赖门控
    // 不参与数值 → gain 用 signal.value（非 base.value×value/100），路由须与 pool 对称走 multFactor。
    const isDynStackShortcut = signal.stacksMultiply === true && !signal.stackFunc
    // 非 dyn-stack：buff_upgrade wrapper 按 base.value×value/100 折算（applySignalPercent），否则用 value。
    const effectiveValue = isDynStackShortcut || !signal.bonusScaleOfSignal
      ? signal.value
      : (signal.bonusScaleOfSignal.value * signal.value) / 100
    if (isDynStackShortcut || signal.amountFunc === 'mult') {
      entry.multFactor *= 1 + effectiveValue / 100
    } else {
      entry.addPercent += effectiveValue
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

/**
 * 把额外 signal 按 bucket 追加到已有 profile（保留 base 信号与其 source），重算 gainProfile。
 *
 * 与 applyHeroAbilityPatch 的区别：后者是「全量覆盖」（repo/local override 整表替换），本函数是
 * 「增量追加」——供 feat/专精注入复用。误用 applyHeroAbilityPatch 传子集会整体替换、抹掉 base
 * 支援信号（35→2），是已修复的 P0 根因。未提供的 bucket 原样保留。
 */
export function appendHeroAbilitySignals(
  hero: ResolvedHeroAbilityProfile,
  additions: { carrySignals?: HeroAbilitySignal[]; supportSignals?: HeroAbilitySignal[] },
  source: HeroAbilitySource,
): ResolvedHeroAbilityProfile {
  const carrySignals = additions.carrySignals
    ? [...hero.carrySignals, ...additions.carrySignals.map((signal) => ({ ...signal, source }))]
    : hero.carrySignals
  const supportSignals = additions.supportSignals
    ? [...hero.supportSignals, ...additions.supportSignals.map((signal) => ({ ...signal, source }))]
    : hero.supportSignals
  return {
    ...hero,
    carrySignals,
    supportSignals,
    gainProfile: computeHeroGainProfile(carrySignals, supportSignals),
    sourceBreakdown: {
      carrySignals: additions.carrySignals
        ? [...hero.sourceBreakdown.carrySignals, ...additions.carrySignals.map(() => source)]
        : hero.sourceBreakdown.carrySignals,
      supportSignals: additions.supportSignals
        ? [...hero.sourceBreakdown.supportSignals, ...additions.supportSignals.map(() => source)]
        : hero.sourceBreakdown.supportSignals,
      unsupportedSignals: hero.sourceBreakdown.unsupportedSignals,
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
