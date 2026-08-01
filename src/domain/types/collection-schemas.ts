import { z } from 'zod'

import { localizedTextSchema, localizedOptionSchema } from './common.ts'

/**
 * collection 输出契约 schema：champions / adventures / patrons / variants。
 * 与 src/domain/types 对齐——DataCollection<T>（items+updatedAt）、LocalizedText、
 * LocalizedOption、Champion、Adventure、Patron、Variant、PatronObjectiveTier。
 *
 * LocalizedText / LocalizedOption 的 schema 单一来源在 src/domain/types/common.ts
 * （z.infer 派生类型，本文件复用同一 schema 值做运行时校验）。其余子结构仍在此定义。
 *
 * 沿用 champion-details-schema 哲学：对象 passthrough 放行非核心字段，避免耦合上游
 * 字段增减；只钉死消费方（planner/simulator/限制筛选/展示）依赖的核心字段类型与必填性，
 * 拦截 normalize 层或上游 definitions 字段漂移。CI：scripts/validate-data-schemas.ts。
 */

const localizedText = localizedTextSchema
const localizedOption = localizedOptionSchema

export const patronObjectiveTierSchema = z
  .object({
    patronId: z.string(),
    tierId: z.string(),
    objectiveArea: z.number().nullable(),
    objectives: z.array(z.unknown()),
  })
  .passthrough()

const patronEligibilityRule = z
  .object({
    type: z.string(),
    supported: z.boolean(),
  })
  .passthrough()

export const championSchema = z
  .object({
    id: z.string(),
    name: localizedText,
    seat: z.number(),
    roles: z.array(z.string()),
    affiliations: z.array(localizedText),
    tags: z.array(z.string()),
    patronEligibility: z
      .object({ eligiblePatronIds: z.array(z.string()) })
      .passthrough()
      .optional(),
    portrait: z.object({ path: z.string() }).passthrough().nullable().optional(),
  })
  .passthrough()

export const adventureSchema = z
  .object({
    id: z.string(),
    ruleContextId: z.string(),
    scenarioKind: z.literal('adventure'),
    name: localizedText,
    campaign: localizedOption,
    description: localizedText.nullable(),
    objectiveArea: z.number().nullable(),
    locationId: z.string().nullable(),
    areaSetId: z.string().nullable(),
    scene: localizedOption.nullable(),
    requirements: z.array(localizedText),
    restrictions: z.array(localizedText),
    rewards: z.array(localizedText),
    repeatable: z.boolean(),
    patronObjectiveTiers: z.array(patronObjectiveTierSchema),
    modeTags: z.array(z.string()),
    mechanics: z.array(z.string()),
  })
  .passthrough()

export const variantSchema = z
  .object({
    id: z.string(),
    ruleContextId: z.string().optional(),
    scenarioKind: z.literal('variant').optional(),
    name: localizedText,
    campaign: localizedOption,
    adventureId: z.string().nullable(),
    adventure: localizedText.nullable(),
    objectiveArea: z.number().nullable(),
    locationId: z.string().nullable(),
    areaSetId: z.string().nullable(),
    scene: localizedOption.nullable(),
    restrictions: z.array(localizedText),
    rewards: z.array(localizedText),
    repeatable: z.boolean().optional(),
  })
  .passthrough()

export const patronSchema = z
  .object({
    id: z.string(),
    name: localizedText,
    description: localizedText.nullable(),
    shortName: z.string().nullable(),
    restrictionsText: z.array(localizedText),
    minObjectiveLevel: z.number().nullable(),
    defaultObjectiveBump: z.number().nullable(),
    weeklyFreePlayCap: z.number().nullable(),
    forceAllowedHeroIds: z.array(z.string()),
    eligibilityRules: z.array(patronEligibilityRule),
    evaluationStatus: z.enum(['complete', 'partial']),
  })
  .passthrough()

const collection = (itemSchema: z.ZodTypeAny) =>
  z.object({ items: z.array(itemSchema), updatedAt: z.string() }).passthrough()

export const championsCollectionSchema = collection(championSchema)
export const adventuresCollectionSchema = collection(adventureSchema)
export const variantsCollectionSchema = collection(variantSchema)
export const patronsCollectionSchema = collection(patronSchema)

/**
 * collection 信封（DataCollection<T> 契约）：items 必为数组、updatedAt 必为字符串。
 * 用于无具名 schema 的 collection 读出校验——只拦信封级腐蚀，item 内部由 TS 类型管。
 */
export const collectionEnvelopeSchema = collection(z.unknown())

/**
 * 具名深校验 collection：planner/限制筛选/展示核心输入，复用 D2 既有 schema。
 * 读出 IDB 持久缓存时，具名者走 item 级深校验拦腐蚀，其余走信封校验（C2）。
 * 新增 collection schema 时在此登记即可。
 */
const collectionSchemaByName: Record<string, z.ZodTypeAny> = {
  champions: championsCollectionSchema,
  adventures: adventuresCollectionSchema,
  variants: variantsCollectionSchema,
  patrons: patronsCollectionSchema,
}

/** 具名 collection → 深校验 schema；未登记 → 信封校验 schema。 */
export function getCollectionReadSchema(name: string): z.ZodTypeAny {
  return collectionSchemaByName[name] ?? collectionEnvelopeSchema
}
