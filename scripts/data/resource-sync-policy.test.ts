import { it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'
import {
  compareUpdatedAt,
  computePipelineHash,
  getUpdatedAtFromDefinitions,
  isForceDataRebuild,
  shouldSkipDataPipeline,
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

// 数据管线（normalize/build）增量跳过 —— data-normalization.md §12。
// pipelineHash 覆盖 scripts/data + normalize/fetch/build 三入口（自动检测、无需 force）；
// 但 src/domain/abilities 归一化逻辑（signalSemantics 等，effect-helpers 的 build 依赖）不在覆盖内——
// 改后须 FORCE_DATA_REBUILD=1 强制重建（见 docs/runbooks/verify-formation-simulator.md「归一化改动注意」）。

it('computePipelineHash 返回 16 字符 hex 且稳定', async () => {
  const first = await computePipelineHash()
  const second = await computePipelineHash()
  expect(first).toMatch(/^[0-9a-f]{16}$/)
  expect(second).toBe(first)
})

it('shouldSkipDataPipeline: 无 existingHash（首次/旧 version.json）→ 不 skip', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-25',
      existingHash: undefined,
      nextUpdatedAt: '2026-07-25',
      nextHash: 'abc123',
    }),
  ).toBe(false)
})

it('shouldSkipDataPipeline: pipelineHash 变（逻辑改了）→ 不 skip（核心：自动重跑）', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-25',
      existingHash: 'old',
      nextUpdatedAt: '2026-07-25',
      nextHash: 'new',
    }),
  ).toBe(false)
})

it('shouldSkipDataPipeline: raw updatedAt 前进（数据更新）→ 不 skip', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-24',
      existingHash: 'abc',
      nextUpdatedAt: '2026-07-25',
      nextHash: 'abc',
    }),
  ).toBe(false)
})

it('shouldSkipDataPipeline: raw + 逻辑都没变 → skip', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-25',
      existingHash: 'abc',
      nextUpdatedAt: '2026-07-25',
      nextHash: 'abc',
    }),
  ).toBe(true)
})

it('shouldSkipDataPipeline: raw checksum 同（数据未变）→ skip，即使 updatedAt 因重新 fetch 前进', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-25',
      existingHash: 'abc',
      nextUpdatedAt: '2026-07-28',
      nextHash: 'abc',
      existingRawChecksum: 3421668139,
      nextRawChecksum: 3421668139,
    }),
  ).toBe(true)
})

it('shouldSkipDataPipeline: raw checksum 变（数据真更新）→ 不 skip', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-25',
      existingHash: 'abc',
      nextUpdatedAt: '2026-07-28',
      nextHash: 'abc',
      existingRawChecksum: 3421668139,
      nextRawChecksum: 9999999999,
    }),
  ).toBe(false)
})

it('shouldSkipDataPipeline: 无 rawChecksum（旧 version.json）→ fallback updatedAt 判断', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-28',
      existingHash: 'abc',
      nextUpdatedAt: '2026-07-28',
      nextHash: 'abc',
    }),
  ).toBe(true)
})

it('shouldSkipDataPipeline: existingHash 非字符串（脏数据）→ 不 skip', () => {
  expect(
    shouldSkipDataPipeline({
      existingUpdatedAt: '2026-07-25',
      existingHash: 12345,
      nextUpdatedAt: '2026-07-25',
      nextHash: 'abc',
    }),
  ).toBe(false)
})

it('isForceDataRebuild: FORCE_DATA_REBUILD=1 → true，否则 false', () => {
  const prev = process.env.FORCE_DATA_REBUILD
  delete process.env.FORCE_DATA_REBUILD
  expect(isForceDataRebuild()).toBe(false)
  process.env.FORCE_DATA_REBUILD = '1'
  try {
    expect(isForceDataRebuild()).toBe(true)
  } finally {
    if (prev === undefined) delete process.env.FORCE_DATA_REBUILD
    else process.env.FORCE_DATA_REBUILD = prev
  }
})
