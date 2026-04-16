import { describe, expect, it } from 'vitest'
import { PNG } from 'pngjs'
import { analyzeIllustrationAlphaPngBuffer } from '../../../scripts/data/illustration-alpha-analysis.mjs'

function buildPngBuffer(width, height, points) {
  const png = new PNG({ width, height })

  for (const { x, y, alpha = 255 } of points) {
    const offset = (png.width * y + x) * 4
    png.data[offset] = 255
    png.data[offset + 1] = 255
    png.data[offset + 2] = 255
    png.data[offset + 3] = alpha
  }

  return PNG.sync.write(png)
}

describe('illustration alpha analysis', () => {
  it('识别单一主体的填充率与连通域', () => {
    const buffer = buildPngBuffer(4, 4, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ])

    expect(
      analyzeIllustrationAlphaPngBuffer(buffer, {
        minComponentPixels: 1,
        minComponentRatio: 0,
      }),
    ).toMatchObject({
      width: 4,
      height: 4,
      solidPixelCount: 4,
      fillRatio: 0.25,
      componentCount: 1,
      significantComponentCount: 1,
      largestComponentRatio: 1,
      secondComponentRatio: 0,
      detachedSignificantAreaRatio: 0,
      isolationScore: 0,
    })
  })

  it('识别分离的大型次级组件', () => {
    const buffer = buildPngBuffer(10, 4, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 7, y: 1 },
      { x: 8, y: 1 },
    ])

    const metrics = analyzeIllustrationAlphaPngBuffer(buffer, {
      minComponentPixels: 2,
      minComponentRatio: 0,
    })

    expect(metrics.componentCount).toBe(2)
    expect(metrics.significantComponentCount).toBe(2)
    expect(metrics.largestComponentRatio).toBeCloseTo(4 / 6, 6)
    expect(metrics.secondComponentRatio).toBeCloseTo(2 / 6, 6)
    expect(metrics.detachedSignificantAreaRatio).toBeCloseTo(2 / 6, 6)
    expect(metrics.isolationScore).toBeGreaterThan(0)
  })

  it('忽略低于显著阈值的细小噪点', () => {
    const buffer = buildPngBuffer(8, 8, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 6, y: 6 },
    ])

    const metrics = analyzeIllustrationAlphaPngBuffer(buffer, {
      minComponentPixels: 2,
      minComponentRatio: 0,
    })

    expect(metrics.componentCount).toBe(2)
    expect(metrics.significantComponentCount).toBe(1)
    expect(metrics.detachedSignificantAreaRatio).toBe(0)
    expect(metrics.secondComponentRatio).toBeCloseTo(1 / 5, 6)
  })
})
