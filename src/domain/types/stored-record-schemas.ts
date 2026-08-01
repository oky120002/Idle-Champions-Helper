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
  .passthrough()

export const userProfileSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    ownedHeroes: z.array(ownedHeroItemSchema),
    updatedAt: z.string(),
  })
  .passthrough()

export const formationDraftSchema = z
  .object({
    layoutId: z.string(),
    placements: z.record(z.string(), z.string()),
    updatedAt: z.string(),
  })
  .passthrough()

export const formationPresetSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    layoutId: z.string(),
    placements: z.record(z.string(), z.string()),
    priority: z.enum(['low', 'medium', 'high']),
    updatedAt: z.string(),
  })
  .passthrough()

export const heroAbilityOverridePatchSchema = z
  .object({
    heroId: z.string(),
  })
  .passthrough()

export const formationPresetArraySchema = z.array(formationPresetSchema)
export const heroAbilityOverridePatchArraySchema = z.array(heroAbilityOverridePatchSchema)

/**
 * 校验存储记录读出：失败即 throw（带字段路径诊断），由消费方 catch 兜底。
 * passthrough 保留非核心字段；返回值经 cast 还原为消费类型（核心字段已校验、其余原样透传）。
 */
export function parseStoredRecord<T>(raw: unknown, schema: z.ZodTypeAny, label: string): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ')
    throw new Error(`存储数据校验失败（${label}）: ${issues}`)
  }
  return result.data as T
}
