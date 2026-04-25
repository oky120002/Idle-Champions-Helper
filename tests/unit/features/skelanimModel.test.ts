import { describe, expect, it } from 'vitest'
import { applyTransform, computeFrameBounds } from '../../../src/features/skelanim-player/model'
import type { SkelAnimSequence } from '../../../src/features/skelanim-player/types'

describe('skelanim model geometry', () => {
  it('按 kleho 的 canvas 顺序先缩放再旋转', () => {
    const frame = {
      depth: 0,
      rotation: Math.PI / 2,
      scaleX: 2,
      scaleY: 1,
      x: 0,
      y: 0,
    }

    const transformedX = applyTransform(frame, 1, 0)
    const transformedY = applyTransform(frame, 0, 1)

    expect(transformedX.x).toBeCloseTo(0)
    expect(transformedX.y).toBeCloseTo(1)
    expect(transformedY.x).toBeCloseTo(-2)
    expect(transformedY.y).toBeCloseTo(0)
  })

  it('computeFrameBounds 对非等比缩放和旋转给出正确包围盒', () => {
    const sequence: SkelAnimSequence = {
      sequenceIndex: 0,
      length: 1,
      pieces: [
        {
          pieceIndex: 0,
          textureId: 0,
          sourceX: 0,
          sourceY: 0,
          sourceWidth: 1,
          sourceHeight: 1,
          centerX: 0,
          centerY: 0,
          frames: [
            {
              depth: 0,
              rotation: Math.PI / 2,
              scaleX: 2,
              scaleY: 1,
              x: 0,
              y: 0,
            },
          ],
        },
      ],
    }

    const bounds = computeFrameBounds(sequence, 0)

    expect(bounds?.minX).toBeCloseTo(-2)
    expect(bounds?.minY).toBeCloseTo(0)
    expect(bounds?.maxX).toBeCloseTo(0)
    expect(bounds?.maxY).toBeCloseTo(1)
  })
})
