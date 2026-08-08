import { z } from 'zod'

/**
 * IndexedDB 存储记录读出契约 schema（4 store：userProfileSnapshot / formationPreset /
 * formationDraft / heroAbilityOverride）。
 *
 * 同 collection-schemas / build-product-schemas 哲学：对象 passthrough 放行非核心字段，
 * 只钉消费方依赖的核心字段类型与必填性。拦截 stale 跨版本快照或 IDB 腐蚀导致的形状偏差——
 * 典型 #4 bug：profile `OwnedHero.level=NaN` 裸 cast 进 scoreFormation，NaN dps 与 ZERO 比较
 * 恒 false → 静默零分无诊断（runtime-edge-audit §2#4）。zod4 `z.number()` 拒 NaN，本层捕获。
 *
 * 读出处（store get/getAll）统一校验：`parseStoredRecord` 失败即 throw，消费方现有 catch 兜住
 *（profile→null→missing-profile blocker；preset/override 各自 catch 降级）。同步守护见
 * stored-record-schema-sync.test.ts（schema 钉死字段 ⊆ 消费 interface）。
 */

/** OwnedHero 核心：heroId + level（zod4 拒 NaN，#4）+ isOwned；loot/legendary/equipment 嵌套结构由 TS 类型管。 */
export const ownedHeroItemSchema = z
  .object({
    heroId: z.string(),
    level: z.number(),
    isOwned: z.boolean(),
  })
  .loose()

export const userProfileSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    ownedHeroes: z.array(ownedHeroItemSchema),
    updatedAt: z.string(),
  })
  .loose()

const scenarioRefSchema = z.object({ kind: z.string(), id: z.string() }).nullable()

export const formationDraftSchema = z
  .object({
    schemaVersion: z.literal(1),
    dataVersion: z.string(),
    layoutId: z.string(),
    scenarioRef: scenarioRefSchema,
    placements: z.record(z.string(), z.string()),
    updatedAt: z.string(),
  })
  .loose()

export const championFilterSnapshotSchema = z
  .object({
    search: z.string(),
    selectedSeats: z.array(z.number()),
    selectedRoles: z.array(z.string()),
    selectedAffiliations: z.array(z.string()),
    selectedRaces: z.array(z.string()),
    selectedGenders: z.array(z.string()),
    selectedAlignments: z.array(z.string()),
    selectedProfessions: z.array(z.string()),
    selectedAcquisitions: z.array(z.string()),
    selectedMechanics: z.array(z.string()),
    selectedPatrons: z.array(z.string()),
  })
  .loose()

export const formationPresetSchema = z
  .object({
    id: z.string(),
    schemaVersion: z.literal(1),
    dataVersion: z.string(),
    name: z.string(),
    description: z.string(),
    layoutId: z.string(),
    placements: z.record(z.string(), z.string()),
    scenarioRef: scenarioRefSchema,
    scenarioTags: z.array(z.string()),
    priority: z.enum(['low', 'medium', 'high']),
    filterSnapshot: championFilterSnapshotSchema.nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .loose()

export const heroAbilityOverridePatchSchema = z
  .object({
    heroId: z.string(),
  })
  .loose()

/**
 * 校验存储记录读出：失败即 throw（带字段路径诊断），由消费方 catch 兜底。
 * passthrough 保留非核心字段；返回值经 cast 还原为消费类型（核心字段已校验、其余原样透传）。
 */
export function parseStoredRecord(raw: unknown, schema: z.ZodType, label: string): unknown {
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.')
        return `${path !== '' ? path : '<root>'}: ${issue.message}`
      })
      .join('; ')
    throw new Error(`存储数据校验失败（${label}）: ${issues}`)
  }
  return result.data
}
