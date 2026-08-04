import { describe, expect, it } from 'vitest'

import type { SkelAnimManifest } from '../../domain/types'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { resolveWalkSequenceSelection } from './walk-selection'
import type { PreparedSkelAnimData, SkelAnimFrame, SkelAnimPiece, SkelAnimSequence } from './types'

function buildFrame(overrides: Partial<SkelAnimFrame> = {}): SkelAnimFrame {
  return { depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0, ...overrides }
}

function buildPiece(frames: Array<SkelAnimFrame | null>, overrides: Partial<SkelAnimPiece> = {}): SkelAnimPiece {
  return {
    pieceIndex: 0,
    textureId: 0,
    sourceX: 0,
    sourceY: 0,
    sourceWidth: 4,
    sourceHeight: 4,
    centerX: 2,
    centerY: 2,
    frames,
    ...overrides,
  }
}

function buildSequence(sequenceIndex: number, pieces: SkelAnimPiece[]): SkelAnimSequence {
  return { sequenceIndex, pieces, length: pieces[0]?.frames.length ?? 1 }
}

function buildPrepared(sequences: SkelAnimSequence[]): PreparedSkelAnimData {
  return {
    data: {
      sheetWidth: 16,
      sheetHeight: 16,
      textures: [],
      characters: [{ characterIndex: 0, name: 'TestHero', sequences }],
    },
    textures: [],
  }
}

function buildManifest(
  defaultSequenceIndex: number,
  defaultFrameIndex: number,
  sequenceCount: number,
): SkelAnimManifest {
  return {
    defaultSequenceIndex,
    defaultFrameIndex,
    sourceGraphicId: 'g',
    sourceGraphic: 'g',
    sourceVersion: 1,
    fps: 30,
    asset: { path: 'a', bytes: 0, format: 'skelanim-zlib' },
    sequences: Array.from({ length: sequenceCount }, (_, index) => ({
      sequenceIndex: index,
      frameCount: 2,
      pieceCount: 1,
      firstRenderableFrameIndex: 0,
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    })),
  }
}

describe('resolveWalkSequenceSelection · 早返回 null 路径', () => {
  it('无 character 时返回 null', () => {
    const prepared: PreparedSkelAnimData = {
      data: { sheetWidth: 16, sheetHeight: 16, textures: [], characters: [] },
      textures: [],
    }

    expect(resolveWalkSequenceSelection(buildManifest(0, 0, 1), prepared)).toBeNull()
  })

  it('序列所有帧都不可渲染时返回 null（firstRenderableFrameIndex=null 被过滤）', () => {
    // piece 两帧均为 null → computeFrameBounds 两帧都返回 null → 无可渲染帧
    const prepared = buildPrepared([buildSequence(0, [buildPiece([null, null])])])

    expect(resolveWalkSequenceSelection(buildManifest(0, 0, 1), prepared)).toBeNull()
  })
})

describe('resolveWalkSequenceSelection · fallback 路径（无合格候选）', () => {
  it('单序列=default 时返回该序列，startFrameIndex 取 defaultFrameIndex', () => {
    const prepared = buildPrepared([buildSequence(0, [buildPiece([buildFrame()])])])

    const result = resolveWalkSequenceSelection(buildManifest(0, 0, 1), prepared)

    expect(result).not.toBeNull()
    const selection = unwrap(result, 'walk selection should not be null')
    expect(selection.sequence.sequenceIndex).toBe(0)
    expect(selection.startFrameIndex).toBe(0)
  })

  it('viewport bounds 被 pad 向外但不超出 manifest 声明的 fallback bounds（clamp 生效）', () => {
    // 单帧 bounds 宽高=4（[-2,-2,2,2]），manifest 声明 bounds=[0,0,10,10] 宽高=10
    // ratio=2.5 > 1.22 触发 pad；pad 后 maxX 落在 (单帧maxX=2, fallback maxX=10) 之间
    const prepared = buildPrepared([buildSequence(0, [buildPiece([buildFrame()])])])

    const result = resolveWalkSequenceSelection(buildManifest(0, 0, 1), prepared)

    expect(result).not.toBeNull()
    const { bounds } = unwrap(result, 'walk selection should not be null')
    expect(bounds.minX).toBeGreaterThanOrEqual(0)
    expect(bounds.minY).toBeGreaterThanOrEqual(0)
    expect(bounds.maxX).toBeGreaterThan(2)
    expect(bounds.maxX).toBeLessThan(10)
    expect(bounds.maxY).toBeGreaterThan(2)
    expect(bounds.maxY).toBeLessThan(10)
  })

  it('defaultFrameIndex 指向非 0 的可渲染帧时，fallback 取该帧索引', () => {
    // 两帧均可渲染，defaultFrameIndex=1 → resolveRenderableFrameIndex 返回 1
    const prepared = buildPrepared([
      buildSequence(0, [buildPiece([buildFrame(), buildFrame({ x: 5 })])]),
    ])

    const result = resolveWalkSequenceSelection(buildManifest(0, 1, 1), prepared)

    expect(result).not.toBeNull()
    const selection = unwrap(result, 'walk selection should not be null')
    expect(selection.sequence.sequenceIndex).toBe(0)
    expect(selection.startFrameIndex).toBe(1)
  })

  it('default 序列不在可渲染集合时，current 回退到首个可渲染序列', () => {
    // defaultSequenceIndex=9 不存在；唯一可渲染序列 index=0 成为 current
    const prepared = buildPrepared([buildSequence(0, [buildPiece([buildFrame()])])])

    const result = resolveWalkSequenceSelection(buildManifest(9, 0, 1), prepared)

    expect(result).not.toBeNull()
    expect(unwrap(result, 'walk selection should not be null').sequence.sequenceIndex).toBe(0)
  })
})

describe('resolveWalkSequenceSelection · 候选选择路径', () => {
  it('存在更高 motion 的合格候选时，选候选而非 default', () => {
    // current=seq0（default，单帧静止，averageMotion=0）
    // candidate=seq1（两帧且 piece 位移，averageMotion=10 > 0，满足 frameCount/可见率/持续率/单帧率阈值）
    const prepared = buildPrepared([
      buildSequence(0, [buildPiece([buildFrame()])]),
      buildSequence(1, [buildPiece([buildFrame({ x: 0 }), buildFrame({ x: 10 })])]),
    ])

    const result = resolveWalkSequenceSelection(buildManifest(0, 0, 2), prepared)

    expect(result).not.toBeNull()
    expect(unwrap(result, 'walk selection should not be null').sequence.sequenceIndex).toBe(1)
  })

  it('候选 motion 不高于 current 时不入选，回落 fallback 返回 default', () => {
    // 两序列都静止（motion=0），candidate 因 averageMotion > current 不成立被过滤
    const prepared = buildPrepared([
      buildSequence(0, [buildPiece([buildFrame(), buildFrame()])]),
      buildSequence(1, [buildPiece([buildFrame(), buildFrame()])]),
    ])

    const result = resolveWalkSequenceSelection(buildManifest(0, 0, 2), prepared)

    expect(result).not.toBeNull()
    expect(unwrap(result, 'walk selection should not be null').sequence.sequenceIndex).toBe(0)
  })

  it('候选帧数<=1 时不满足 frameCount>1，回落 fallback', () => {
    // seq1 单帧 + 有 motion 不可能（单帧无帧间位移）；这里 seq1 单帧、motion=0，多重不满足
    const prepared = buildPrepared([
      buildSequence(0, [buildPiece([buildFrame()])]),
      buildSequence(1, [buildPiece([buildFrame()])]),
    ])

    const result = resolveWalkSequenceSelection(buildManifest(0, 0, 2), prepared)

    expect(result).not.toBeNull()
    expect(unwrap(result, 'walk selection should not be null').sequence.sequenceIndex).toBe(0)
  })
})
