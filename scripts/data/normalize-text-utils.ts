/**
 * 归一化层的标量 / 本地化文本工具。
 *
 * 这些纯函数原本在 normalize-idle-champions-definitions、sync-pets、official-rule-helpers、
 * formation-layout-helpers 各自复制（且已出现 toText 缺 Number.isFinite、compareLocalizedText
 * 缺 'en' locale 导致跨机器排序漂移等分歧），统一到此模块。
 */

import type { JsonValue, LocalizedText } from '../../src/domain/types/common.ts'

/**
 * 把标量收拢为非空字符串；NaN/Infinity 等非有限数返回 null（避免落盘成 "NaN"）。
 */
export function toText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed !== '' ? trimmed : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

/**
 * 排序比较器：显式 'en' locale 让结果在 CI / 不同 host 上可复现。
 * 无 locale 参数时 localeCompare 依赖运行时 ICU，中文 display 顺序会漂移；
 * 这里走 'en' collation 退化为码点序，确定性优先。如需拼音序需 full-icu +
 * 'zh-Hans' { collation: 'pinyin' }，属独立产品决策。
 */
export function compareLocalizedText(left: LocalizedText, right: LocalizedText): number {
  const cmp = left.display.localeCompare(right.display, 'en')
  return cmp !== 0 ? cmp : left.original.localeCompare(right.original, 'en')
}

export function normalizeLocalizedText(
  originalValue: unknown,
  displayValue: unknown,
  fallbackValue: unknown = '',
): LocalizedText | null {
  const fallback = toText(fallbackValue) ?? ''
  const original = toText(originalValue) ?? toText(displayValue) ?? fallback
  const display = toText(displayValue) ?? original

  if (original === '' || display === '') {
    return null
  }

  return { original, display }
}

export function normalizeLocalizedTextList(
  originalValues: readonly unknown[],
  displayValues: readonly unknown[],
): LocalizedText[] {
  const items: LocalizedText[] = []
  const maxLength = Math.max(originalValues.length, displayValues.length)

  for (let index = 0; index < maxLength; index += 1) {
    const item = normalizeLocalizedText(originalValues[index], displayValues[index])

    if (item) {
      items.push(item)
    }
  }

  return uniqueLocalizedTexts(items)
}

export function uniqueLocalizedTexts(values: readonly (LocalizedText | null)[]): LocalizedText[] {
  const unique = new Map<string, LocalizedText>()

  for (const value of values) {
    if (value === null || value.original === '' || value.display === '') {
      continue
    }

    unique.set(`${value.original}\u0000${value.display}`, value)
  }

  return Array.from(unique.values())
}

export function toLocalizedOverrideList(value: unknown): LocalizedText[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toLocalizedOverrideList(item))
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const text = toText(value)
    return text != null && text !== '' ? [{ original: text, display: text }] : []
  }

  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const item = normalizeLocalizedText(record.original, record.display)
    return item ? [item] : []
  }

  return []
}

export function uniqueStrings(values: readonly unknown[]): string[] {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === 'string' && value.trim() !== ''),
    ),
  )
}

export function uniqueNumbers(values: readonly unknown[]): number[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0,
      ),
    ),
  ).sort((left, right) => left - right)
}

export function normalizeNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: number[] = []

  for (const item of value) {
    const next = normalizeNumber(item)

    if (next !== null && next >= 0) {
      normalized.push(next)
    }
  }

  return normalized
}

export function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toStringList(item))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed === '') {
      return []
    }

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (trimmed.includes('|')) {
      return trimmed
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    return [trimmed]
  }

  if (typeof value === 'number') {
    return [String(value)]
  }

  return []
}

export function toTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toTextList(item))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed !== '' ? [trimmed] : []
  }

  if (typeof value === 'number') {
    return [String(value)]
  }

  return []
}

// eslint-disable-next-line sonarjs/function-return-type -- 类型分发归一化器：各分支按值类型返回不同 JsonValue 变体，统一返回一种类型会丢失类型信息
export function normalizeJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (value === undefined) {
    return null
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeJsonValue(item)]),
    )
  }

  return toText(value)
}

export function normalizeOptionalLocalizedText(
  originalValue: unknown,
  displayValue: unknown,
  fallbackValue: unknown = '',
): LocalizedText | null {
  return normalizeLocalizedText(originalValue, displayValue, fallbackValue)
}

export function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const text = toText(value)

  if (text == null || text === '') {
    return null
  }

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}
