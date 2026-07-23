import { z } from 'zod'

/**
 * collection 输出契约 schema：champions / adventures / patrons / variants。
 * 与 src/domain/types 对齐——DataCollection<T>（items+updatedAt）、LocalizedText、
 * LocalizedOption、Champion、Adventure、Patron、Variant、PatronObjectiveTier。
 *
 * 沿用 champion-details-schema 哲学：对象 passthrough 放行非核心字段，避免耦合上游
 * 字段增减；只钉死消费方（planner/simulator/限制筛选/展示）依赖的核心字段类型与必填性，
 * 拦截 normalize 层或上游 definitions 字段漂移。CI：scripts/validate-data-schemas.mjs。
 */

const localizedText = z.object({ original: z.string(), display: z.string() }).passthrough()
const localizedOption = z
  .object({ id: z.string(), original: z.string(), display: z.string() })
  .passthrough()

const patronObjectiveTier = z
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
    patronObjectiveTiers: z.array(patronObjectiveTier),
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

const collection = (itemSchema) =>
  z.object({ items: z.array(itemSchema), updatedAt: z.string() }).passthrough()

export const championsCollectionSchema = collection(championSchema)
export const adventuresCollectionSchema = collection(adventureSchema)
export const variantsCollectionSchema = collection(variantSchema)
export const patronsCollectionSchema = collection(patronSchema)
