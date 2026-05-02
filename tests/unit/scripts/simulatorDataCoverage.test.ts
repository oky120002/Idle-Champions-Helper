import { describe, expect, it } from 'vitest'
import { generateCoverageReport } from '../../../scripts/data/simulator-data-coverage.mjs'

describe('simulator data coverage report', () => {
  it('把已知有用 key 标记为 covered 或 uncovered', () => {
    const knownKeys = ['hero_id', 'level', 'upgrades', 'feats']
    const coveredKeys = new Set(['hero_id', 'level'])

    const report = generateCoverageReport(knownKeys, coveredKeys)

    expect(report).toHaveLength(4)
    const heroIdEntry = report.find((e: { key: string }) => e.key === 'hero_id')
    expect(heroIdEntry?.status).toBe('covered')

    const featsEntry = report.find((e: { key: string }) => e.key === 'feats')
    expect(featsEntry?.status).toBe('uncovered')
  })

  it('未知 key 保留以供复查', () => {
    const knownKeys = ['hero_id', 'unknown_new_field']
    const coveredKeys = new Set(['hero_id'])

    const report = generateCoverageReport(knownKeys, coveredKeys)

    const unknownEntry = report.find((e: { key: string }) => e.key === 'unknown_new_field')
    expect(unknownEntry?.status).toBe('uncovered')
    expect(unknownEntry?.reviewNeeded).toBe(true)
  })

  it('报告包含 usefulness、current output 和 next action 列', () => {
    const report = generateCoverageReport(['hero_id'], new Set(['hero_id']))

    const entry = report[0]
    expect(entry).toHaveProperty('key')
    expect(entry).toHaveProperty('usefulness')
    expect(entry).toHaveProperty('currentOutput')
    expect(entry).toHaveProperty('nextAction')
    expect(entry).toHaveProperty('status')
  })
})
