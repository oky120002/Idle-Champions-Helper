import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * scripts 通用 JSON 读写、raw 收窄、并发池与 CLI 过滤参数解析。
 * 各 sync / build 脚本统一从此处导入，避免复制粘贴漂移。
 */

// 读出的 JSON 是不可信外来数据，返回 unknown；由调用方在边界处 zod 校验或显式收窄（见
// docs/specs/guidelines/testing.md §8）。
export async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

export async function readJsonIfExists(filePath: string): Promise<unknown> {
  try {
    return await readJson(filePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

// raw JSON 收窄辅助：readJson 返回 unknown，这些 helper 在消费边界安全收窄（见
// docs/specs/guidelines/testing.md §8）。build 管线各 builder 共用，故下沉到此。
/** 把 unknown 安全收窄为 Record<string, unknown>（null 安全）；非对象返回 null。 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

/** 把 unknown 收窄为数组；非数组返回空数组（防 undefined.map 崩溃）。 */
export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

/**
 * 固定并发数的工作池：结果按输入顺序对齐返回。
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R> | R,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  async function consume(): Promise<void> {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await worker(items[currentIndex]!, currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => consume()),
  )

  return results
}

/**
 * 把 `--ids a,b,c` 形式的逗号分隔参数解析为 Set；空值返回 null（表示不过滤）。
 */
export function parseIdFilter(rawValue: string | undefined): Set<string> | null {
  if (!rawValue) {
    return null
  }

  const ids = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return ids.length > 0 ? new Set(ids) : null
}
