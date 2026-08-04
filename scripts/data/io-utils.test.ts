import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { it, expect } from 'vitest'
import {
  readJson,
  readJsonIfExists,
  writeJson,
  runWithConcurrency,
  parseIdFilter,
} from './io-utils.ts'

async function withTempDir(callback: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'io-utils-'))
  try {
    await callback(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

it('readJson 解析已有 JSON 文件', async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, 'a.json')
    await writeJson(file, { x: 1 })
    expect(await readJson(file)).toEqual({ x: 1 })
  })
})

it('readJson 不存在时抛 ENOENT', async () => {
  await withTempDir(async (dir) => {
    await expect(readJson(path.join(dir, 'missing.json'))).rejects.toSatisfy(
      (error: NodeJS.ErrnoException) => error.code === 'ENOENT',
    )
  })
})

it('readJsonIfExists 不存在时返回 null，存在时返回内容', async () => {
  await withTempDir(async (dir) => {
    const missing = path.join(dir, 'missing.json')
    expect(await readJsonIfExists(missing)).toBeNull()

    const file = path.join(dir, 'a.json')
    await writeJson(file, [1, 2])
    expect(await readJsonIfExists(file)).toEqual([1, 2])
  })
})

it('writeJson 创建父目录并以换行结尾', async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, 'nested', 'b.json')
    await writeJson(file, { ok: true })
    const raw = await readFile(file, 'utf8')
    expect(raw.endsWith('\n')).toBe(true)
    expect(JSON.parse(raw)).toEqual({ ok: true })
  })
})

it('runWithConcurrency 保持结果顺序且尊重并发上限', async () => {
  let active = 0
  let maxActive = 0
  const items = Array.from({ length: 10 }, (_, i) => i)
  const results = await runWithConcurrency(items, 3, async (item) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    })
    active -= 1
    return item * 2
  })
  expect(results).toEqual(items.map((i) => i * 2))
  expect(maxActive).toBeLessThanOrEqual(3)
})

it('runWithConcurrency 空数组直接返回空数组', async () => {
  expect(await runWithConcurrency([], 4, async (x) => x)).toEqual([])
})

it('parseIdFilter 解析逗号分隔、去空白；空值返回 null', () => {
  expect(parseIdFilter('')).toBeNull()
  expect(parseIdFilter(null as unknown as string)).toBeNull()
  expect(parseIdFilter(' , ')).toBeNull()
  expect(parseIdFilter('a, b ,c')).toEqual(new Set(['a', 'b', 'c']))
})
