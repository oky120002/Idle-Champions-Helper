import { z } from 'zod'

export interface DataVersion {
  current: string
  updatedAt: string
  notes: string[]
}

export interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

export type MessageRef =
  | { key: string; params?: Record<string, string | number | MessageRef> | undefined }
  | { literal: string }

/** 可递归嵌套的 UI 消息引用；外部产物和本地存储共用同一形状校验。 */
export const messageRefSchema: z.ZodType<MessageRef> = z.lazy(() => z.union([
  z.object({ key: z.string(), params: z.record(z.string(), z.union([z.string(), z.number(), messageRefSchema])).optional() }).loose(),
  z.object({ literal: z.string() }).loose(),
]))

// 外部游戏数据契约（passthrough，见 docs/specs/guidelines/testing-methodology.md §3）。
// schema 即类型单一来源：LocalizedText 经 z.infer 派生，scripts/ 归一化校验复用同一 schema。
export const localizedTextSchema = z
  .object({ original: z.string(), display: z.string() })
  .loose()
export type LocalizedText = z.infer<typeof localizedTextSchema>

export const localizedOptionSchema = z
  .object({ id: z.string(), original: z.string(), display: z.string() })
  .loose()
export type LocalizedOption = z.infer<typeof localizedOptionSchema>

export type JsonPrimitive = string | number | boolean | null

export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
