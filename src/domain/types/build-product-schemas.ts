import { z } from 'zod'

import { localizedTextSchema, messageRefSchema } from './common.ts'

const localizedText = localizedTextSchema

/**
 * build 派生产物输出契约 schema（planner 核心消费的 6 个产物）。
 *
 * 与 collection-schemas.ts 同哲学：对象 passthrough 放行非核心字段（不耦合上游字段增减），
 * 只钉消费方（planner/simulator/buffs）依赖的核心字段类型与必填性，拦截 build 逻辑 `as` /
 * optional-but-expected 字段导致的形状偏差。CI：scripts/validate-data-schemas.ts。
 *
 * envelope 两类：
 * - `{items, updatedAt}`（hero-abilities 另带 pipelineHash，passthrough 放行）：hero-abilities /
 *   scenarios / loot-catalog / effect-definitions
 * - `{catalog, updatedAt}`（catalog = Record<heroId, Entry[]>）：feat-catalog / specialization-catalog
 *
 * 同步守护见 build-product-schema-sync.test.ts（schema 钉死字段 ⊆ 消费 interface，typecheck 层防漂移）。
 */

/**
 * hero-abilities.json item：英雄能力 profile（planner 评估核心数据源）。
 * 钉 identity + 座位 + DPS/暴击 base + signal 列表存在性；signal 元素结构由 HeroAbilitySignal 类型管。
 */
export const heroAbilityProfileItemSchema = z
  .object({
    heroId: z.string(),
    name: localizedText,
    seat: z.number(),
    tags: z.array(z.string()),
    baseDamage: z.number(),
    baseHealth: z.number(),
    baseCritChancePercent: z.number().nullable().optional(),
    carrySignals: z.array(z.unknown()),
    supportSignals: z.array(z.unknown()),
  })
  .loose()

/**
 * scenarios.json item：场景引用、名称、目标区、敌人类型、阵型拓扑、限制与可行性上下文。
 * 钉 variantId + scenarioRef + objectiveArea + enemyTypes + scenarioWarnings + 布局 id + 槽位拓扑核心
 * （slotId/row/column）+ forced/allowed 名单 + 占格数。
 */
const plannerScenarioSlotSchema = z
  .object({
    slotId: z.string(),
    row: z.number(),
    column: z.number(),
  })
  .loose()

const tagClauseSchema = z.object({
  required: z.array(z.string()),
  forbidden: z.array(z.string()),
})

const attributeRequirementSchema = z.object({
  stat: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']),
  operator: z.enum(['>=', '<=']),
  value: z.number().int(),
})

export const plannerScenarioItemSchema = z
  .object({
    variantId: z.string(),
    scenarioRef: z.object({
      kind: z.enum(['campaign', 'adventure', 'variant', 'trial', 'timeGate']),
      id: z.string(),
    }),
    name: localizedText,
    formationLayoutId: z.string().nullable(),
    objectiveArea: z.number().nullable(),
    slotTopology: z.array(plannerScenarioSlotSchema),
    forcedHeroes: z.array(z.string()),
    enemyTypes: z.array(z.string()),
    scenarioWarnings: z.array(messageRefSchema),
    allowedHeroes: z.array(z.string()),
    allowedTagExpression: z.array(tagClauseSchema),
    attributeRequirements: z.array(attributeRequirementSchema),
    occupiedSlotCount: z.number().int().min(0),
    viabilityContext: z.object({
      armor: z.object({
        segments: z.number().int().positive(),
        scaling: z.object({ additional: z.number().int().positive(), everyAreas: z.number().int().positive() }).optional(),
      }).nullable(),
      hitsBased: z.object({
        segments: z.number().int().positive(),
        scaling: z.object({ additional: z.number().int().positive(), everyAreas: z.number().int().positive() }).optional(),
      }).nullable(),
      damageModifier: z.number().min(0).nullable(),
      enemyDamageMult: z.number().positive().nullable(),
      healthDrainRate: z.number().min(0).nullable(),
    }),
    damageSourcePattern: z.object({
      kind: z.enum(['same-column', 'adjacent', 'not-adjacent', 'within-slots', 'front-columns', 'behind-columns']),
      referenceHeroId: z.string(),
      includeReference: z.boolean(),
      columnSpan: z.number().int().positive().optional(),
      slotSpan: z.number().int().positive().optional(),
    }).nullable(),
  })
  .loose()

/** loot-catalog.json item：装备定义（per-slot effect_string，装备加成解析源）。 */
export const lootCatalogItemSchema = z
  .object({
    heroId: z.string(),
    slotId: z.string(),
    rarity: z.string(),
    effectString: z.string(),
  })
  .loose()

/** effect-definitions.json item：effect_def template（effect_def,<id> 解引用源）。钉 id + effectKeys。 */
const effectDefinitionKeySchema = z
  .object({
    effectString: z.string(),
  })
  .loose()

export const effectDefinitionItemSchema = z
  .object({
    id: z.string(),
    effectKeys: z.array(effectDefinitionKeySchema),
  })
  .loose()

/** feat-catalog.json catalog 值：feat 定义（id + rarity + signals 列表）。 */
export const featCatalogItemSchema = z
  .object({
    id: z.string(),
    rarity: z.number(),
    signals: z.array(z.unknown()),
  })
  .loose()

/** specialization-catalog.json catalog 值：专精 upgrade（upgradeId + signals 列表）。 */
export const specializationCatalogItemSchema = z
  .object({
    upgradeId: z.string(),
    signals: z.array(z.unknown()),
  })
  .loose()

const itemCollection = (itemSchema: z.ZodType) =>
  z.object({ items: z.array(itemSchema), updatedAt: z.string() }).loose()

const catalogCollection = (entrySchema: z.ZodType) =>
  z.object({ catalog: z.record(z.string(), z.array(entrySchema)), updatedAt: z.string() }).loose()

export const heroAbilitiesSchema = itemCollection(heroAbilityProfileItemSchema)
export const scenariosSchema = itemCollection(plannerScenarioItemSchema)
export const lootCatalogSchema = itemCollection(lootCatalogItemSchema)
export const effectDefinitionsSchema = itemCollection(effectDefinitionItemSchema)
export const legendaryEffectsSchema = itemCollection(z.object({
  id: z.string(),
  effectString: z.string(),
  stackFunc: z.string().nullable(),
  targetFilters: z.array(z.unknown()).nullable(),
  filterTargets: z.array(z.unknown()).nullable(),
  heroIds: z.array(z.string()).optional(),
}).loose())
export const featCatalogSchema = catalogCollection(featCatalogItemSchema)
export const specializationCatalogSchema = catalogCollection(specializationCatalogItemSchema)
