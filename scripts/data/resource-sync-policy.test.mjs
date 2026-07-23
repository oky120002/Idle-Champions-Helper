import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'
import {
  compareUpdatedAt,
  getUpdatedAtFromDefinitions,
  shouldSkipResourceSync,
  writeUpdatedAtJsonFile,
} from './resource-sync-policy.ts'

test('compareUpdatedAt 按 YYYY-MM-DD 先后比较', () => {
  assert.equal(compareUpdatedAt('2026-02-02', '2026-02-02'), 0)
  assert.equal(compareUpdatedAt('2026-02-03', '2026-02-02') > 0, true)
  assert.equal(compareUpdatedAt('2026-02-01', '2026-02-02') < 0, true)
})

test('shouldSkipResourceSync 仅在现有更新时间不早于新更新时间时跳过', () => {
  assert.equal(
    shouldSkipResourceSync({
      existingUpdatedAt: '2026-02-02',
      nextUpdatedAt: '2026-02-02',
    }),
    true,
  )
  assert.equal(
    shouldSkipResourceSync({
      existingUpdatedAt: '2026-02-03',
      nextUpdatedAt: '2026-02-02',
    }),
    true,
  )
  assert.equal(
    shouldSkipResourceSync({
      existingUpdatedAt: '2026-02-01',
      nextUpdatedAt: '2026-02-02',
    }),
    false,
  )
})

test('getUpdatedAtFromDefinitions 从官方 current_time 提取日期', () => {
  assert.equal(
    getUpdatedAtFromDefinitions({
      current_time: Date.parse('2026-02-03T12:00:00Z') / 1000,
    }),
    '2026-02-03',
  )
})

test('writeUpdatedAtJsonFile 会创建父目录并写出 JSON', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'resource-sync-policy-'))
  const targetFile = path.join(tempDir, 'nested', 'updated-at.json')

  await writeUpdatedAtJsonFile(targetFile, {
    updatedAt: '2026-02-03',
    resources: ['portraits'],
  })

  const payload = JSON.parse(await readFile(targetFile, 'utf8'))
  assert.deepEqual(payload, {
    updatedAt: '2026-02-03',
    resources: ['portraits'],
  })
})
