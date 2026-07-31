import { createHash } from 'node:crypto'
import { access, readdir, readFile, rm } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'
import { readJsonIfExists, writeJson } from './io-utils.ts'

// 读取的外部 JSON（collection / updatedAt / definitions）按 testing-conventions §8 以 unknown
// 在边界收窄，不为不可信形状过度声明（那是 zod 的职责）。

function normalizeUpdatedAt(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

function normalizeComparableValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  // value 已排除 null/undefined/number/string；剩余为外部不可信类型，防御性转字符串。
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(value)
}

export function getUpdatedAtFromDefinitions(
  rawDefinitions: { current_time?: unknown } | null,
): string {
  const currentTime = rawDefinitions?.current_time
  if (typeof currentTime === 'number') {
    return new Date(currentTime * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

export function compareUpdatedAt(left: unknown, right: unknown): number {
  const normalizedLeft = normalizeUpdatedAt(left)
  const normalizedRight = normalizeUpdatedAt(right)

  if (!normalizedLeft && !normalizedRight) {
    return 0
  }

  if (!normalizedLeft) {
    return -1
  }

  if (!normalizedRight) {
    return 1
  }

  return normalizedLeft.localeCompare(normalizedRight)
}

export function shouldSkipResourceSync({
  existingUpdatedAt,
  nextUpdatedAt,
}: {
  existingUpdatedAt: unknown
  nextUpdatedAt: unknown
}): boolean {
  return compareUpdatedAt(existingUpdatedAt, nextUpdatedAt) >= 0
}

export async function readExistingCollection(
  collectionFile: string,
): Promise<{ items: unknown[]; updatedAt?: unknown } | null> {
  const collection = await readJsonIfExists(collectionFile)

  if (
    !collection
    || typeof collection !== 'object'
    || !Array.isArray((collection as Record<string, unknown>).items)
  ) {
    return null
  }

  return collection as { items: unknown[]; updatedAt?: unknown }
}

export async function readUpdatedAtFromJsonFile(filePath: string): Promise<string | null> {
  const payload = await readJsonIfExists(filePath)
  const updatedAt =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).updatedAt
      : undefined
  return normalizeUpdatedAt(updatedAt)
}

export async function writeUpdatedAtJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeJson(filePath, value)
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

interface ReuseCheckInput {
  existingItem: {
    image?: { path?: unknown } | null
    sourceGraphic?: unknown
    sourceVersion?: unknown
  } | null
  nextSourceGraphic: unknown
  nextSourceVersion: unknown
  nextImagePath: unknown
}

export function canReuseGeneratedImage({
  existingItem,
  nextSourceGraphic,
  nextSourceVersion,
  nextImagePath,
}: ReuseCheckInput): boolean {
  const existingPath = existingItem?.image?.path
  if (!existingPath) {
    return false
  }

  return (
    normalizeComparableValue(existingItem?.sourceGraphic) === normalizeComparableValue(nextSourceGraphic)
    && normalizeComparableValue(existingItem?.sourceVersion) === normalizeComparableValue(nextSourceVersion)
    && existingPath === nextImagePath
  )
}

export async function removeUnexpectedFiles(
  directory: string,
  expectedFileNames: Set<string>,
): Promise<void> {
  let entries: Dirent[]

  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && !expectedFileNames.has(entry.name))
      .map((entry) => rm(path.join(directory, entry.name), { force: true })),
  )
}

// ---------------------------------------------------------------------------
// 数据管线（normalize / build）增量跳过 —— data-normalization.md §12
// ---------------------------------------------------------------------------

/**
 * 数据管线源码指纹：scripts/data 下所有非 test 的 .ts + normalize/fetch/build 三个入口脚本。
 * 用于增量跳过：归一化/build 逻辑改动 → 指纹变 → 自动重跑，不依赖开发者记得 force。
 * ponytail: 粗粒度（整个 scripts/data），任何数据脚本改动都触发重跑——保守不漏优于精确但漏检。
 */
const PIPELINE_HASH_DIRS = ['scripts/data']
const PIPELINE_HASH_FILES = [
  'scripts/normalize-idle-champions-definitions.ts',
  'scripts/fetch-idle-champions-definitions.ts',
  'scripts/build-idle-champions-data.ts',
]

async function collectTsFiles(dir: string): Promise<string[]> {
  const result: string[] = []
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...await collectTsFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      result.push(full)
    }
  }
  return result
}

export async function computePipelineHash(): Promise<string> {
  const files = new Set<string>(PIPELINE_HASH_FILES)
  for (const dir of PIPELINE_HASH_DIRS) {
    for (const file of await collectTsFiles(dir)) {
      files.add(file)
    }
  }
  const hash = createHash('sha256')
  for (const file of [...files].sort()) {
    hash.update(file)
    try {
      hash.update(await readFile(file))
    } catch {
      // 文件不存在（开发中删除）→ hash 已含 file 路径，删除本身会改变 hash → 触发重跑
    }
  }
  return hash.digest('hex').slice(0, 16)
}

/** 手动强制重跑逃生口：`FORCE_DATA_REBUILD=1` 跳过所有增量判定。 */
export function isForceDataRebuild(): boolean {
  return process.env.FORCE_DATA_REBUILD === '1' || process.env.FORCE_DATA_REBUILD === 'true'
}

/**
 * normalize/build 增量跳过判定。skip 当且仅当：
 * ① 有既有逻辑指纹记录；② 指纹未变（归一化/build 逻辑没改）；③ raw updatedAt 未前进。
 * 任一变化（逻辑改 / raw 更新）或 force → 不 skip → 重跑。
 */
export function shouldSkipDataPipeline({
  existingUpdatedAt,
  existingHash,
  nextUpdatedAt,
  nextHash,
  existingRawChecksum,
  nextRawChecksum,
}: {
  existingUpdatedAt: unknown
  existingHash: unknown
  nextUpdatedAt: unknown
  nextHash: string
  /** raw 数据 checksum（稳定指纹）；提供时优先于 updatedAt 判断。 */
  existingRawChecksum?: unknown
  nextRawChecksum?: unknown
}): boolean {
  if (typeof existingHash !== 'string' || existingHash === '') return false
  if (existingHash !== nextHash) return false
  // 优先用 raw checksum（稳定数据指纹）：游戏数据没变（checksum 同）→ skip，即使
  // current_time（updatedAt）因重新 fetch 单调前进。根因修复：旧逻辑仅用 current_time 判断，
  // 而 current_time 每次 fetch 变，导致 191 产物纯时间戳被反复重写（内容未变）。
  if (existingRawChecksum !== undefined && nextRawChecksum !== undefined) {
    return existingRawChecksum === nextRawChecksum
  }
  // fallback（旧 version.json 无 rawChecksum）：updatedAt 没前进 → skip
  if (compareUpdatedAt(existingUpdatedAt, nextUpdatedAt) < 0) return false
  return true
}

