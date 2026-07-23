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

// 外部游戏数据契约（passthrough，见 docs/product/testing-conventions.md §8）。
// schema 即类型单一来源：LocalizedText 经 z.infer 派生，scripts/ 归一化校验复用同一 schema。
export const localizedTextSchema = z
  .object({ original: z.string(), display: z.string() })
  .passthrough()
export type LocalizedText = z.infer<typeof localizedTextSchema>

export const localizedOptionSchema = z
  .object({ id: z.string(), original: z.string(), display: z.string() })
  .passthrough()
export type LocalizedOption = z.infer<typeof localizedOptionSchema>

export type JsonPrimitive = string | number | boolean | null

export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
