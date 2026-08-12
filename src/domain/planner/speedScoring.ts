/**
 * 速度维度建模：将 11 类速度效果建模为「区域推进效率因子」（speedMultiplier）。
 *
 * 速度与 DPS/gold 正交——速度英雄通过非伤害机制加速过层（跳层/刷新加速/任务倍增等），
 * 不是提高 DPS。team-speed 评分模式下 objectiveValue = speedMultiplier（区域推进效率）。
 *
 * 设计：每个速度效果归属一个 category，同 category 内按 IC 语义聚合（加法或乘法），
 * category 间乘法。详见 docs/research/gameplay/speed-mechanics.md。
 */

/**
 * 速度效果类别。7 类静态可计算 + 1 类动态假设（areaSkip）。
 * areaSkip = 区域跳过/条件过关/初期冲层，效果依赖跨重置状态或运行时条件，
 * 默认值由 DYNAMIC_SPEED_DEFAULTS 提供，可通过入参覆盖。
 */
export type SpeedCategory =
  | 'questProgress'
  | 'spawnSpeed'
  | 'extraEnemies'
  | 'timeScale'
  | 'transitionSpeedup'
  | 'simultaneousSpawn'
  | 'preSpawn'
  | 'areaSkip'

/** 单条速度效果（build 期从 champion-details effect_keys 提取）。 */
export interface SpeedEffectEntry {
  category: SpeedCategory
  /**
   * 效果数值（类别语义不同）：
   * - questProgress（multiply 变体）: trigger chance (0-100)
   * - questProgress（reduce 变体）: { chance, reductionAmount } 拆入 chance + value
   * - spawnSpeed / timeScale / transitionSpeedup / areaSkip: 加性百分比 (e.g. 100 = +100%)
   * - extraEnemies: 额外敌人期望值（chance% × count）
   * - simultaneousSpawn / preSpawn: 1（二值，英雄在场即生效）
   */
  value: number
  /** questProgress multiply: 击杀/拾取倍率 (e.g. 2 = double)。 */
  multiplier?: number
  /** questProgress reduce: 需求缩减量 (0-100)。 */
  reductionAmount?: number
  rawEffect: string
  /** 源 upgrade id（装备 buff_upgrade 反查用）；null = 无 upgrade 源。 */
  upgradeId?: string | null
  /**
   * 阵型效果缩放表：基于相邻英雄的 tag 数量查表替换 value。
   * 如 Hew Maan 的 hewmaan_fellow_humans → other_human_bonuses（相邻人类数 → amount）。
   * 运行时由 applyFormationSpeedEffects 求值。
   */
  formationBonusTable?: FormationBonusTable | null
}

/** 阵型效果查表结构（build 期从 effect_key 元数据提取）。 */
export interface FormationBonusTable {
  /** 要计数的 tag（如 'human'）。 */
  tag: string
  /** 按相邻 tag 数量查 amount 替换效果值。 */
  ranges: ReadonlyArray<{ min: number; max: number; amount: number }>
}

/** 每英雄速度画像（嵌入 hero-abilities.json hero model）。 */
export interface HeroSpeedProfile {
  heroId: string
  effects: SpeedEffectEntry[]
  /** 该英雄独立在场时的综合速度因子（≥1），用于 computationMode 候选裁剪排序。 */
  speedGain: number
}

/** 单类别因子（breakdown 展示用）。 */
export interface SpeedCategoryFactor {
  category: SpeedCategory
  factor: number
}

/** 单英雄速度贡献（breakdown 展示用）。 */
export interface SpeedHeroContribution {
  heroId: string
  effects: readonly SpeedEffectEntry[]
}

/** 阵型速度结构化拆解（JSON 可序列化，供 UI 渲染速度贡献明细）。 */
export interface SpeedBreakdown {
  /** 综合速度因子（所有类别因子之积）。 */
  total: number
  /** 非平凡类别因子（factor !== 1）。 */
  categoryFactors: readonly SpeedCategoryFactor[]
  /** 有速度效果的英雄列表。 */
  heroContributions: readonly SpeedHeroContribution[]
}

/**
 * 动态速度英雄：已知速度英雄但效果依赖跨重置状态/运行时条件/用户输入，无法静态提取。
 * 用 areaSkip 类别建模——value = 平均每层跳过/秒杀的等效百分比，因子 = 1 + Σ(value/100)。
 *
 * 默认值取值口径（用户冻结 2026-08-10）：
 * - 有用户数据 → 用户数据作为默认值（未来从存档提取 Briv 冲刺堆叠等）
 * - 无用户数据 → 使用此处的保守默认值
 * - 所有值可通过入参覆盖（planner options），UI 可暴露部分控件
 */
export const DYNAMIC_SPEED_HERO_IDS: ReadonlySet<string> = new Set([
  '58', // Briv — 区域跳层
  '128', // Lae'zel — 条件过关
  '139', // Thellora — 初期冲层
  '156', // Halsin — 条件过关
])

/** 动态速度英雄默认效果（无用户数据时使用，value = 等效跳过百分比）。 */
export const DYNAMIC_SPEED_DEFAULTS: ReadonlyMap<string, SpeedEffectEntry> = new Map([
  // Briv: briv_unnatural_haste 基础 25% 跳层概率 → 保守默认 25%
  ['58', { category: 'areaSkip', value: 25, rawEffect: 'briv_unnatural_haste (default)' }],
  // Lae'zel: 17 层堆叠完成区域，保守估计 ~18% 等效跳过率
  ['128', { category: 'areaSkip', value: 18, rawEffect: 'laezel_completion (default)' }],
  // Thellora: 初期冲层 10 层（一次性），对典型 50 层刷图等效 ~15%
  ['139', { category: 'areaSkip', value: 15, rawEffect: 'thellora_rush (default)' }],
  // Halsin: 大招触发区域完成，保守估计 ~11% 等效跳过率
  ['156', { category: 'areaSkip', value: 11, rawEffect: 'halsin_completion (default)' }],
])

/** simultaneousSpawn / preSpawn 的固定加成（无精确数值，社区定性估计）。 */
const SIMULTANEOUS_BONUS = 1.5
const PRESPAWN_BONUS = 1.2

/** timeScale 上限（引擎硬编码 10×）。 */
const TIME_SCALE_CAP = 10
/** transitionSpeedup 上限（Diana 装备可达 400%+50%=4.5，保守封顶 5×）。 */
const TRANSITION_CAP = 5

function sumBy<T>(arr: readonly T[], pick: (item: T) => number): number {
  let sum = 0
  for (const item of arr) {
    sum += pick(item)
  }
  return sum
}

/** questProgress 因子 = progressMult / (1 − requirementReduction)。 */
function computeQuestProgress(effects: readonly SpeedEffectEntry[]): number {
  const progressMult = effects
    .filter((e) => e.multiplier != null)
    .reduce((acc, e) => acc * (1 + (e.value / 100) * ((e.multiplier ?? 1) - 1)), 1)

  const reduction = sumBy(
    effects.filter((e) => e.reductionAmount != null),
    (e) => (e.value / 100) * ((e.reductionAmount ?? 0) / 100),
  )

  return progressMult / Math.max(1 - reduction, 0.001)
}

/** 加性百分比因子: 1 + Σ(value/100)，可含上限。 */
function additiveMult(effects: readonly SpeedEffectEntry[], cap?: number): number {
  const raw = 1 + sumBy(effects, (e) => e.value / 100)
  return cap != null ? Math.min(raw, cap) : raw
}

function hasCategory(effects: readonly SpeedEffectEntry[], category: SpeedCategory): boolean {
  return effects.some((e) => e.category === category)
}

/** 类别计算顺序（与乘积顺序一致，breakdown 展示用）。 */
const CATEGORY_ORDER: readonly SpeedCategory[] = [
  'questProgress', 'spawnSpeed', 'extraEnemies', 'timeScale', 'transitionSpeedup', 'simultaneousSpawn', 'preSpawn', 'areaSkip',
]

/** 从扁平效果列表计算各类别因子。computeFormationSpeedMultiplier 和 computeSpeedBreakdown 共用。 */
function computeCategoryFactors(allEffects: readonly SpeedEffectEntry[]): Map<SpeedCategory, number> {
  const factors = new Map<SpeedCategory, number>()
  factors.set('questProgress', computeQuestProgress(allEffects.filter((e) => e.category === 'questProgress')))
  factors.set('spawnSpeed', additiveMult(allEffects.filter((e) => e.category === 'spawnSpeed')))
  factors.set('extraEnemies', additiveMult(allEffects.filter((e) => e.category === 'extraEnemies')))
  factors.set('timeScale', additiveMult(allEffects.filter((e) => e.category === 'timeScale'), TIME_SCALE_CAP))
  factors.set('transitionSpeedup', additiveMult(allEffects.filter((e) => e.category === 'transitionSpeedup'), TRANSITION_CAP))
  factors.set('simultaneousSpawn', hasCategory(allEffects, 'simultaneousSpawn') ? SIMULTANEOUS_BONUS : 1)
  factors.set('preSpawn', hasCategory(allEffects, 'preSpawn') ? PRESPAWN_BONUS : 1)
  factors.set('areaSkip', additiveMult(allEffects.filter((e) => e.category === 'areaSkip')))
  return factors
}

/** 类别因子之积 = 综合速度因子。 */
function productOfCategoryFactors(factors: ReadonlyMap<SpeedCategory, number>): number {
  let product = 1
  for (const factor of factors.values()) {
    product *= factor
  }
  return product
}

/**
 * 计算阵型级综合速度因子。
 *
 * @param profiles 阵型中所有英雄的速度画像
 * @returns 速度因子（≥1，越大越快）
 */
export function computeFormationSpeedMultiplier(profiles: readonly HeroSpeedProfile[]): number {
  return productOfCategoryFactors(computeCategoryFactors(profiles.flatMap((p) => p.effects)))
}

/**
 * 计算阵型速度结构化拆解（UI 展示用）：各类别因子 + 按英雄贡献。
 */
export function computeSpeedBreakdown(profiles: readonly HeroSpeedProfile[]): SpeedBreakdown {
  const factorsMap = computeCategoryFactors(profiles.flatMap((p) => p.effects))

  const categoryFactors = CATEGORY_ORDER
    .map((category) => ({ category, factor: factorsMap.get(category) ?? 1 }))
    .filter((entry) => entry.factor !== 1)

  const heroContributions = profiles
    .filter((p) => p.effects.length > 0)
    .map((p) => ({ heroId: p.heroId, effects: p.effects }))

  return { total: productOfCategoryFactors(factorsMap), categoryFactors, heroContributions }
}

/**
 * 计算单英雄独立速度因子（build 期预算 speedGain，运行时用于候选裁剪排序）。
 * 上界近似：假设所有效果命中，不含阵型交互。
 */
export function computeHeroSpeedGain(effects: readonly SpeedEffectEntry[]): number {
  if (effects.length === 0) return 1
  return computeFormationSpeedMultiplier([{ heroId: '_', effects: [...effects], speedGain: 1 }])
}

/**
 * 装备 buff_upgrade 缩放：对每条速度效果，若其源 upgrade 被装备 buff_upgrade 增强，
 * 按 IC 语义缩放效果值（value × (1 + buffPercent/100)）。
 *
 * buffPercent 来自 EquipmentBuff.value（enchant 缩放后的 wrapper 百分比）。
 * 仅缩放有 upgradeId 的效果（二值效果 simultaneousSpawn/preSpawn 不缩放——它们是 handler 不是数值）。
 */
export function applyEquipmentBuffsToSpeedEffects(
  effects: readonly SpeedEffectEntry[],
  buffs: ReadonlyArray<{ targetUpgradeId: string; value: number }>,
): SpeedEffectEntry[] {
  if (effects.length === 0 || buffs.length === 0) return [...effects]
  // upgradeId → total buff percent（同一 upgrade 可能被多件装备 buff）
  const buffByUpgrade = new Map<string, number>()
  for (const buff of buffs) {
    buffByUpgrade.set(buff.targetUpgradeId, (buffByUpgrade.get(buff.targetUpgradeId) ?? 0) + buff.value)
  }
  return effects.map((effect) => {
    if (!effect.upgradeId) return effect
    const buffPercent = buffByUpgrade.get(effect.upgradeId)
    if (buffPercent == null || buffPercent === 0) return effect
    // 二值效果不缩放
    if (effect.category === 'simultaneousSpawn' || effect.category === 'preSpawn') return effect
    return { ...effect, value: effect.value * (1 + buffPercent / 100) }
  })
}

/**
 * 阵型效果运行时上下文：提供槽位邻接关系和英雄标签，供 applyFormationSpeedEffects 查表。
 * 由 scoreTeamSpeed 从 scenario.slotTopology + placedEntries 构造。
 */
export interface FormationSpeedContext {
  /** heroId → slotId（placed 英雄位置）。 */
  readonly slotByHeroId: ReadonlyMap<string, string>
  /** slotId → 该位英雄的 tags（查 formationBonusTable.tag 用）。 */
  readonly tagsBySlot: ReadonlyMap<string, readonly string[]>
  /** slotId → 相邻槽位 id 列表（来自 scenario.slotTopology）。 */
  readonly adjacentSlotIds: ReadonlyMap<string, readonly string[]>
}

/** 按相邻 tag 数量查表返回 amount（无匹配返回 0）。 */
function lookupFormationBonus(
  ranges: ReadonlyArray<{ min: number; max: number; amount: number }>,
  count: number,
): number {
  for (const range of ranges) {
    if (count >= range.min && count <= range.max) {
      return range.amount
    }
  }
  return 0
}

/**
 * 阵型效果缩放：对带 formationBonusTable 的速度效果，运行时按相邻英雄 tag 数量查表替换 value。
 * 如 Hew Maan：相邻人类数 → other_human_bonuses → 替换任务倍增概率。
 * profiles 中无阵型效果时原样返回（无开销）。
 */
export function applyFormationSpeedEffects(
  profiles: readonly HeroSpeedProfile[],
  context: FormationSpeedContext,
): HeroSpeedProfile[] {
  const hasFormationEffect = profiles.some((p) => p.effects.some((e) => e.formationBonusTable))
  if (!hasFormationEffect) return [...profiles]

  return profiles.map((profile) => {
    const slotId = context.slotByHeroId.get(profile.heroId)
    if (!slotId) return profile

    const adjSlots = context.adjacentSlotIds.get(slotId) ?? []
    const hasBonus = profile.effects.some((e) => e.formationBonusTable)
    if (!hasBonus) return profile

    return {
      ...profile,
      effects: profile.effects.map((effect) => {
        if (!effect.formationBonusTable) return effect
        const tag = effect.formationBonusTable.tag
        const adjacentCount = adjSlots.filter((id) => {
          const tags = context.tagsBySlot.get(id)
          return tags?.includes(tag) ?? false
        }).length
        return { ...effect, value: lookupFormationBonus(effect.formationBonusTable.ranges, adjacentCount) }
      }),
    }
  })
}
