import { it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'
import {
  compareUpdatedAt,
  getUpdatedAtFromDefinitions,
  shouldSkipResourceSync,
  writeUpdatedAtJsonFile,
} from './resource-sync-policy.ts'

it('compareUpdatedAt 按 YYYY-MM-DD 先后比较', () => {
  expect(compareUpdatedAt('2026-02-02', '2026-02-02')).toBe(0)
  expect(compareUpdatedAt('2026-02-03', '2026-02-02') > 0).toBe(true)
  expect(compareUpdatedAt('2026-02-01', '2026-02-02') < 0).toBe(true)
})

it('shouldSkipResourceSync 仅在现有更新时间不早于新更新时间时跳过', () => {
  expect(
    shouldSkipResourceSync({
      existingUpdatedAt: '2026-02-02',
      nextUpdatedAt: '2026-02-02',
    }),
  ).toBe(true)
  expect(
    shouldSkipResourceSync({
      existingUpdatedAt: '2026-02-03',
      nextUpdatedAt: '2026-02-02',
    }),
  ).toBe(true)
  expect(
    shouldSkipResourceSync({
      existingUpdatedAt: '2026-02-01',
      nextUpdatedAt: '2026-02-02',
    }),
  ).toBe(false)
})

it('getUpdatedAtFromDefinitions 从官方 current_time 提取日期', () => {
  expect(
    getUpdatedAtFromDefinitions({
      current_time: Date.parse('2026-02-03T12:00:00Z') / 1000,
    }),
  ).toBe('2026-02-03')
})

it('writeUpdatedAtJsonFile 会创建父目录并写出 JSON', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'resource-sync-policy-'))
  const targetFile = path.join(tempDir, 'nested', 'updated-at.json')

  await writeUpdatedAtJsonFile(targetFile, {
    updatedAt: '2026-02-03',
    resources: ['portraits'],
  })

  const payload: unknown = JSON.parse(await readFile(targetFile, 'utf8'))
  expect(payload).toEqual({
    updatedAt: '2026-02-03',
    resources: ['portraits'],
  })
})
