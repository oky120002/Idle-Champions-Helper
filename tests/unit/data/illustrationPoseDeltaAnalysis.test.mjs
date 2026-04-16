import { describe, expect, it } from 'vitest'
import {
  analyzeIllustrationPoseDelta,
  classifyIllustrationPoseDelta,
} from '../../../scripts/data/illustration-pose-delta-analysis.mjs'

describe('illustration pose delta analysis', () => {
  it('为 detached 与 fill 同时改善的候选给出正向分数', () => {
    const current = {
      fillRatio: 0.28,
      significantComponentCount: 3,
      secondComponentRatio: 0.14,
      detachedSignificantAreaRatio: 0.16,
      isolationScore: 0.01,
    }
    const candidate = {
      fillRatio: 0.34,
      significantComponentCount: 2,
      secondComponentRatio: 0.04,
      detachedSignificantAreaRatio: 0.05,
      isolationScore: 0.002,
    }

    const result = analyzeIllustrationPoseDelta(current, candidate)

    expect(result.score).toBeGreaterThan(1)
    expect(result.reasons).toContain('显著分离区域下降 0.11')
    expect(classifyIllustrationPoseDelta(result.score)).toBe('promising')
  })

  it('为更差的候选给出负向分数', () => {
    const current = {
      fillRatio: 0.4,
      significantComponentCount: 1,
      secondComponentRatio: 0,
      detachedSignificantAreaRatio: 0,
      isolationScore: 0,
    }
    const candidate = {
      fillRatio: 0.32,
      significantComponentCount: 3,
      secondComponentRatio: 0.08,
      detachedSignificantAreaRatio: 0.09,
      isolationScore: 0.01,
    }

    const result = analyzeIllustrationPoseDelta(current, candidate)

    expect(result.score).toBeLessThan(0)
    expect(classifyIllustrationPoseDelta(result.score)).toBe('negative')
  })
})
