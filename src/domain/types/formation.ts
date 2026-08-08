import type { z } from 'zod'

import type { adventureSchema, patronObjectiveTierSchema } from './collection-schemas'
import type { LocalizedOption, LocalizedText } from './common'
import type { AbilityScoreKey } from './champions'

/** 单个 tag 子句（AND 内部）：英雄须拥有全部 required tag，且不拥有任何 forbidden tag。 */
export interface TagClause {
  required: string[]
  forbidden: string[]
}

/** 标签表达式（DNF = OR of ANDs）：英雄匹配任一 clause 即合格。 */
export type TagExpression = TagClause[]

/** 属性门槛：英雄能力值须满足 operator × value。 */
export interface AttributeRequirement {
  stat: AbilityScoreKey
  operator: '>=' | '<='
  value: number
}

export interface VariantAreaHighlight {
  id: string
  kind: string
  start: number
  end: number | null
  loopAt: number | null
  repeatAt: number | null
}

export interface VariantAttackMix {
  melee: number
  ranged: number
  magic: number
  other: number
}

export type PatronObjectiveTier = z.infer<typeof patronObjectiveTierSchema>

export interface PatronEligibilityRule {
  type: 'tags' | 'stats' | 'time_available_days'
  rawExpression?: string
  requiredAnyTags?: string[] | null
  blockedWhen?: 'all' | 'any'
  stats?: Array<{
    stat: string
    operator: string
    value: number
  }>
  maxAgeDays?: number | null
  supported: boolean
}

export interface Patron {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  shortName: string | null
  restrictionsText: LocalizedText[]
  minObjectiveLevel: number | null
  defaultObjectiveBump: number | null
  weeklyFreePlayCap: number | null
  forceAllowedHeroIds: string[]
  eligibilityRules: PatronEligibilityRule[]
  evaluationStatus: 'complete' | 'partial'
}

export type Adventure = z.infer<typeof adventureSchema>

export interface Variant {
  id: string
  ruleContextId?: string
  scenarioKind?: 'variant'
  name: LocalizedText
  campaign: LocalizedOption
  adventureId: string | null
  adventure: LocalizedText | null
  objectiveArea: number | null
  locationId: string | null
  areaSetId: string | null
  scene: LocalizedOption | null
  restrictions: LocalizedText[]
  rewards: LocalizedText[]
  repeatable?: boolean
  patronObjectiveTiers?: PatronObjectiveTier[]
  modeTags?: string[]
  enemyCount: number
  enemyTypes: string[]
  enemyTypeCounts?: Record<string, number>
  attackMix: VariantAttackMix
  specialEnemyCount: number
  escortCount: number
  areaHighlights: VariantAreaHighlight[]
  areaMilestones: number[]
  mechanics: string[]
  /** 强制使用英雄 id（game_change force_use_heroes）。 */
  forcedHeroIds: string[]
  /** 白名单英雄 id（game_change only_allow_crusaders.by_ids；空=无白名单）。 */
  allowedHeroIds: string[]
  /** 白名单英雄 tag 表达式（DNF：OR of ANDs，`^`=AND `!`=取反 `|`=OR；空=无 tag 白名单）。 */
  allowedTagExpression: TagExpression
}

export interface ScenarioRef {
  kind: 'campaign' | 'adventure' | 'variant' | 'trial' | 'timeGate'
  id: string
}

export interface FormationContext extends ScenarioRef {
  name: LocalizedText
  campaignId?: string
  variantAdventureId?: string
}

export interface FormationSlot {
  id: string
  row: number
  column: number
  x?: number
  y?: number
  adjacentSlotIds?: string[]
}

export interface FormationLayout {
  id: string
  name: LocalizedText
  notes?: LocalizedText
  slots: FormationSlot[]
  applicableContexts?: ScenarioRef[]
  sourceContexts?: FormationContext[]
  laneHints?: {
    front?: string[]
    middle?: string[]
    back?: string[]
  }
}

export interface FormationDraft {
  schemaVersion: 1
  dataVersion: string
  layoutId: string
  scenarioRef: ScenarioRef | null
  placements: Record<string, string>
  updatedAt: string
}

export type PresetPriority = 'low' | 'medium' | 'high'

/**
 * 英雄筛选条件快照——保存方案时的筛选上下文，恢复时候选池按此还原。
 * 结构与 features/champion-filters 的 CommonFilterSearchState 对齐（结构子类型兼容，
 * 阵型页复用 appendCommonFilterSearchParams / readCommonFilterState 编解码）。
 */
export interface ChampionFilterSnapshot {
  search: string
  selectedSeats: number[]
  selectedRoles: string[]
  selectedAffiliations: string[]
  selectedRaces: string[]
  selectedGenders: string[]
  selectedAlignments: string[]
  selectedProfessions: string[]
  selectedAcquisitions: string[]
  selectedMechanics: string[]
  selectedPatrons: string[]
}

export interface FormationPreset {
  id: string
  schemaVersion: 1
  dataVersion: string
  name: string
  description: string
  layoutId: string
  placements: Record<string, string>
  scenarioRef: ScenarioRef | null
  scenarioTags: string[]
  priority: PresetPriority
  /** 保存时的筛选条件快照；无筛选或旧方案为 null。 */
  filterSnapshot: ChampionFilterSnapshot | null
  createdAt: string
  updatedAt: string
}
