import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  readJson,
  readJsonIfExists,
  writeJson,
  runWithConcurrency,
  parseIdFilter,
} from './io-utils.mjs'

async function withTempDir(callback) {
  const dir = await mkdtemp(path.join(tmpdir(), 'io-utils-'))
  try {
    await callback(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('readJson 解析已有 JSON 文件', async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, 'a.json')
    await writeJson(file, { x: 1 })
    assert.deepEqual(await readJson(file), { x: 1 })
  })
})

test('readJson 不存在时抛 ENOENT', async () => {
  await withTempDir(async (dir) => {
    await assert.rejects(() => readJson(path.join(dir, 'missing.json')), (error) => error.code === 'ENOENT')
  })
})

test('readJsonIfExists 不存在时返回 null，存在时返回内容', async () => {
  await withTempDir(async (dir) => {
    const missing = path.join(dir, 'missing.json')
    assert.equal(await readJsonIfExists(missing), null)

    const file = path.join(dir, 'a.json')
    await writeJson(file, [1, 2])
    assert.deepEqual(await readJsonIfExists(file), [1, 2])
  })
})

test('writeJson 创建父目录并以换行结尾', async () => {
  await withTempDir(async (dir) => {
    const file = path.join(dir, 'nested', 'b.json')
    await writeJson(file, { ok: true })
    const raw = await readFile(file, 'utf8')
    assert.equal(raw.endsWith('\n'), true)
    assert.deepEqual(JSON.parse(raw), { ok: true })
  })
})

test('runWithConcurrency 保持结果顺序且尊重并发上限', async () => {
  let active = 0
  let maxActive = 0
  const items = Array.from({ length: 10 }, (_, i) => i)
  const results = await runWithConcurrency(items, 3, async (item) => {
    active += 1
    maxActive = Math.max(maxActive, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return item * 2
  })
  assert.deepEqual(results, items.map((i) => i * 2))
  assert.ok(maxActive <= 3, `并发不应超过上限，实际峰值 ${maxActive}`)
})

test('runWithConcurrency 空数组直接返回空数组', async () => {
  assert.deepEqual(await runWithConcurrency([], 4, async (x) => x), [])
})

test('parseIdFilter 解析逗号分隔、去空白；空值返回 null', () => {
  assert.equal(parseIdFilter(''), null)
  assert.equal(parseIdFilter(null), null)
  assert.equal(parseIdFilter(' , '), null)
  assert.deepEqual(parseIdFilter('a, b ,c'), new Set(['a', 'b', 'c']))
})
