// 英雄实测参照基准类型（统一口径）。co-located 到 planner，被 championReferenceVerification.test.ts
// 与 damageReferenceVerification.test.ts 消费。一英雄一份 *ReferenceData.ts（satisfies ChampionReference），
// 含一份或多份观测快照（不同等级/上下文/时间），对应 docs/research/gameplay/champion-mechanics/<heroId>.md。
// 详见 docs/specs/modules/planner/champion-reference-verification.md 与 docs/runbooks/add-champion-reference.md。
//
// 统一口径（冻结）：无论「机制倍率参照」（蔚式，abilities/expected.multiplierChecks）还是
// 「伤害快照参照」（明斯克/瓦罗式，attacks/incomingBuffs/providedBuffs），都进同一 snapshots 结构。
// 单英雄快照 formationSize=1；多英雄阵型多份快照共享 context.formationId + positions。

/**
 * DPS 机制 id —— 与 docs/specs/modules/planner/dps-mechanics.md 注册表同源。
 * 三处一致用同一 id：代码分支（placementFit.ts resolveSignalMultiplier 注释）、
 * 英雄参照（ChampionReferenceAbility.mechanicIds）、文档注册表。
 */
export type DpsMechanicId =
  | 'formation-count-mult-stack'
  | 'formation-count-add-stack'
  | 'dynamic-stack-multiply'
  | 'topology-count-stack'
  | 'bonus-scale-linkage'
  | 'buff-upgrade-modifier'
  | 'static-dps-mult-fallback'

/** 机制参数（通用字段，非英雄特化）。 */
export interface ChampionReferenceAbilityMechanics {
  perStackPercent?: number
  amountFunc?: 'add' | 'mult'
  stackFunc?: string
  stacksMultiply?: boolean
  /** 阵营/标签条件，任意值（good|acqinc|cteam、female、human、geneutral...）。 */
  formationCountQualifier?: string
  /** 提供动态层数的技能（如出言不逊 ← 我太老了）。 */
  stackSource?: string
  /** 层数上限表达式（如 highest_available_area * 10）。 */
  stackMaxExpr?: string
}

export interface ChampionReferenceAbility {
  nameZh: string
  nameEn?: string
  /** 对照键：匹配 evaluatePlacementFit 返回的 scoreBreakdown.rawEffect。 */
  rawEffect: string
  /** 关联键：这个技能用了哪些通用机制。 */
  mechanicIds: DpsMechanicId[]
  mechanics: ChampionReferenceAbilityMechanics
  /** 游戏内显示值原话（人类核对基准）。 */
  gameDisplay: Record<string, string | number>
}

export interface ChampionReferenceModifier {
  type: 'specialization' | 'equipment' | 'feat'
  nameZh: string
  targetAbility: string
  bonus: string
  /** 装备效果拆解（基础 + 物品等级 + 每级增量）。 */
  breakdown?: { base: number; itemLevel: number; perLevel: number }
}

export interface ChampionReferenceMultiplierCheck {
  /** 标注对应机制（分析用，可选）。 */
  mechanicId?: DpsMechanicId
  /** 对照键：匹配 evaluatePlacementFit.scoreBreakdown 的 rawEffect。 */
  rawEffect: string
  name: string
  formula: string
  expectedMultiplier: number
}

/**
 * 观测到的 buff（即将生效/提供效果）。source 分类决定单英雄隔离测试剔除交叉 buff
 * （source:'hero' 在隔离测试中剔除——那英雄不在隔离阵型）。
 */
export type ObservedBuffSource = 'blessing' | 'patron' | 'hero' | 'self'

export interface ObservedBuff {
  nameZh: string
  /** 来自谁：恩赐祝福名 / 赞助者名 / 其他英雄名 / self。 */
  fromZh: string
  source: ObservedBuffSource
  /** 效果原话，如「使明斯克的伤害提升400%」。 */
  effect: string
  /**
   * 伤害加成百分比（游戏显示「伤害提升 X%」的 X），用于聚合成外部加成全局乘数（约束③）。
   * 仅对 source:blessing|patron 有意义；hero/self 是阵型内 buff，由 signal 建模，不进此字段。
   * 乘数 = 1 + damageBonusPercent/100（如 400 → ×5）。非伤害类（如冷却缩减）不填。
   */
  damageBonusPercent?: number
  note?: string
}

export interface ObservedAttack {
  nameZh: string
  /** 游戏显示伤害原值（游戏记数法字符串，如「1.25e45」）；absolute-dps 校准基准。 */
  damage?: string
  cooldownSeconds?: number
  description?: string
}

/** 阵型位置（多英雄阵型观测用）。 */
export interface ObservedPosition {
  heroId: string
  /** 从右往左数第几列（玩家视角，与游戏 UI 一致）。 */
  columnFromRight?: number
  /** 行描述（「最上」/「最下」等自然语义）。 */
  row?: string
  note?: string
}

/**
 * 一份观测快照：某英雄在某等级/上下文下的游戏实测。
 * - 机制倍率参照（蔚式）：填 abilities/modifiers/expected.multiplierChecks。
 * - 伤害快照参照（明斯克/瓦罗式）：填 attacks/incomingBuffs/providedBuffs。
 * 两者可共存；字段全可选（除 id/capturedAt/context）按数据实际能填的填。
 */
export interface ChampionReferenceSnapshot {
  /** 快照 id（同英雄内唯一，如 'vi-area193'、'minsc-l722'）。 */
  id: string
  /** 入库时间（ISO date）；同英雄多快照取最接近当前。 */
  capturedAt: string
  context: {
    /** 英雄等级（伤害快照用）。 */
    level?: number
    area?: number
    highestAvailableArea?: number
    map?: string
    patron?: string
    formationSize: number
    /** 对照测试构造阵型用（实测或 mock，见 mock 字段标注）。 */
    formationHeroIds: string[]
    /** 多英雄阵型位置（单英雄快照可省）。 */
    positions?: ObservedPosition[]
    /** 阵型 id：多英雄阵型跨英雄聚合用（如 'cursed-farmer-1'）。 */
    formationId?: string
    note?: string
  }
  /** 实测攻击伤害（游戏显示原值；absolute-dps 校准基准）。 */
  attacks?: { base?: ObservedAttack; ultimate?: ObservedAttack }
  /** 英雄基础属性（力量/敏捷等；hero-static，记于最完整快照供核查）。 */
  abilityScores?: Record<string, number>
  /** 装备（hero-static，记于最完整快照；equipmentAdjustmentByHero 校准用）。 */
  equipment?: { nameZh: string; itemLevel?: number; effect: string }[]
  /** 即将生效的效果（此英雄受到的外部 buff：blessing/patron/其他英雄提供）。 */
  incomingBuffs?: ObservedBuff[]
  /** 提供效果（此英雄给阵型的 buff）。 */
  providedBuffs?: ObservedBuff[]
  /** 蔚式机制分析（机制倍率断言用）。 */
  abilities?: ChampionReferenceAbility[]
  modifiers?: ChampionReferenceModifier[]
  expected?: {
    /** 对照游戏实测的层数（蔚=1930，对齐 area×10）。 */
    manualStackCount?: number
    multiplierChecks?: ChampionReferenceMultiplierCheck[]
    /** 对照 hero_dps poolMultiplier vs 游戏显示「叠层系数」，< 30%。绝对值未校准（见 architecture.md「投影模式」）。 */
    calibrationTarget?: { gamePoolMultiplier: string; tolerance: string }
  }
  /** 数据缺口标注：字段路径 → mock 说明；用户补实测后移除。 */
  mock?: Record<string, string>
}

export interface ChampionReference {
  heroId: string
  name: { zh: string; en: string }
  source: 'game-observation'
  /** 指向 docs/research/gameplay/champion-mechanics/<heroId>.md 完整调研记录。 */
  researchDoc: string
  /** 智能体优化后的自然语言摘要（结构化清理，非用户原话），与 researchDoc 互证。 */
  rawDescription: { naturalLanguage: string; optimizedAt: string }
  /** 一英雄一份或多份观测快照（不同等级/上下文/时间）。 */
  snapshots: ChampionReferenceSnapshot[]
}
