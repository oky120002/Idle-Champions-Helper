// 英雄 DPS 机制参照基准类型。co-located 到 planner，被 championReferenceVerification.test.ts 消费。
// 每英雄一份 *ReferenceData.ts（satisfies ChampionReference），对应 docs/research/gameplay/champion-mechanics/<hero>.md 人类调研。
// 详见 docs/specs/modules/planner/champion-reference-verification.md 与 dps-mechanics.md。

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

export interface ChampionReference {
  heroId: string
  name: { zh: string; en: string }
  capturedAt: string
  source: 'game-observation'
  /** 指向 docs/research/gameplay/champion-mechanics/<hero>.md 完整调研记录。 */
  researchDoc: string
  /** 智能体优化后的自然语言摘要（结构化清理，非用户原话），与 researchDoc 互证。 */
  rawDescription: {
    naturalLanguage: string
    optimizedAt: string
  }
  scenario: {
    area: number
    highestAvailableArea: number
    formationSize: number
    /** 对照测试构造阵型用（实测或 mock，见 mock 字段标注）。 */
    formationHeroIds: string[]
    note?: string
  }
  abilities: ChampionReferenceAbility[]
  modifiers: ChampionReferenceModifier[]
  expected: {
    /** 对照游戏实测的层数（蔚=1930，对齐 area×10）；UI 默认 1000 是另一回事（通用假设）。 */
    manualStackCount: number
    multiplierChecks: ChampionReferenceMultiplierCheck[]
    /**
     * 对照 hero_dps poolMultiplier vs 游戏显示「叠层系数」，< 30%。
     * 不对照 carryDps/总奖金（含 baseDps 未校准，绝对值待 bud-verification 联动）。
     */
    calibrationTarget?: { gamePoolMultiplier: string; tolerance: string }
  }
  /** 数据缺口标注：字段路径 → mock 说明；用户补实测后移除条目，对照精度自动提升。 */
  mock?: Record<string, string>
}
