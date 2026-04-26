import { describe, expect, it } from 'vitest'
import type { SkelAnimManifest } from '../../../src/domain/types'
import {
  buildSkelAnimStatusText,
  resolveCanvasRasterScale,
  resolvePreparedAssetState,
  resolveSequenceSelection,
  resolveSkelAnimPlayback,
  resolveSkelAnimViewportLayout,
} from '../../../src/features/skelanim-player/skelanim-canvas-model'
import type {
  PreparedSkelAnimEntry,
  SkelAnimCanvasLabels,
  SkelAnimLoadErrorEntry,
} from '../../../src/features/skelanim-player/types'

const labels: SkelAnimCanvasLabels = {
  play: '播放',
  pause: '暂停',
  reducedMotion: '减少动态效果',
  error: '加载失败',
  animated: '动态预览',
  fallback: '静态预览',
}

function createAnimation(
  bounds: SkelAnimManifest['sequences'][number]['bounds'] | null = null,
): SkelAnimManifest {
  return {
    sourceGraphicId: 'Graphic/Demo',
    sourceGraphic: 'Graphic_Demo',
    sourceVersion: 7,
    asset: {
      path: 'v1/skins/demo.skelanim',
      format: 'skelanim-zlib',
      bytes: 128,
    },
    fps: 12,
    defaultSequenceIndex: 7,
    defaultFrameIndex: 2,
    sequences: [
      {
        sequenceIndex: 7,
        pieceCount: 1,
        firstRenderableFrameIndex: 2,
        frameCount: 3,
        bounds,
      },
    ],
  }
}

function createPreparedEntry(): PreparedSkelAnimEntry {
  return {
    assetPath: 'v1/skins/demo.skelanim',
    value: {
      data: {
        sheetWidth: 64,
        sheetHeight: 64,
        textures: [],
        characters: [
          {
            characterIndex: 0,
            name: 'Demo',
            sequences: [
              {
                sequenceIndex: 7,
                length: 3,
                pieces: [
                  {
                    pieceIndex: 0,
                    textureId: 1,
                    sourceX: 0,
                    sourceY: 0,
                    sourceWidth: 20,
                    sourceHeight: 10,
                    centerX: 10,
                    centerY: 5,
                    frames: [
                      null,
                      {
                        depth: 0,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                        x: 30,
                        y: 40,
                      },
                      {
                        depth: 0,
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                        x: 32,
                        y: 42,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      textures: [],
    },
  }
}

function createWalkAnimation(): SkelAnimManifest {
  return {
    sourceGraphicId: 'Graphic/WalkDemo',
    sourceGraphic: 'Graphic_WalkDemo',
    sourceVersion: 9,
    asset: {
      path: 'v1/skins/walk-demo.skelanim',
      format: 'skelanim-zlib',
      bytes: 256,
    },
    fps: 12,
    defaultSequenceIndex: 0,
    defaultFrameIndex: 0,
    sequences: [
      { sequenceIndex: 0, pieceCount: 1, firstRenderableFrameIndex: 0, frameCount: 4, bounds: { minX: 0, minY: 0, maxX: 20, maxY: 20 } },
      { sequenceIndex: 1, pieceCount: 1, firstRenderableFrameIndex: 0, frameCount: 4, bounds: { minX: 2, minY: 0, maxX: 24, maxY: 20 } },
      { sequenceIndex: 2, pieceCount: 1, firstRenderableFrameIndex: 0, frameCount: 4, bounds: { minX: -10, minY: 0, maxX: 40, maxY: 32 } },
    ],
  }
}

function createWalkPreparedEntry(): PreparedSkelAnimEntry {
  const piece = { pieceIndex: 0, textureId: 1, sourceX: 0, sourceY: 0, sourceWidth: 20, sourceHeight: 20, centerX: 0, centerY: 0 }

  return {
    assetPath: 'v1/skins/walk-demo.skelanim',
    value: {
      data: {
        sheetWidth: 64,
        sheetHeight: 64,
        textures: [],
        characters: [
          {
            characterIndex: 0,
            name: 'WalkDemo',
            sequences: [
              {
                sequenceIndex: 0,
                length: 4,
                pieces: [
                  {
                    ...piece,
                    frames: [{ depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }, { depth: 0, rotation: 0.01, scaleX: 1, scaleY: 1, x: 0.5, y: 0 }, { depth: 0, rotation: -0.01, scaleX: 1, scaleY: 1, x: 0, y: 0.25 }, { depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: -0.25, y: 0 }],
                  },
                ],
              },
              {
                sequenceIndex: 1,
                length: 4,
                pieces: [
                  {
                    ...piece,
                    frames: [{ depth: 0, rotation: 0.06, scaleX: 1, scaleY: 1, x: 2, y: 0 }, { depth: 0, rotation: 0.11, scaleX: 1, scaleY: 1, x: 4, y: 0.3 }, { depth: 0, rotation: -0.08, scaleX: 1, scaleY: 1, x: 2.5, y: 0.15 }, { depth: 0, rotation: -0.03, scaleX: 1, scaleY: 1, x: 3.5, y: 0 }],
                  },
                ],
              },
              {
                sequenceIndex: 2,
                length: 4,
                pieces: [
                  {
                    ...piece,
                    frames: [{ depth: 0, rotation: 0.45, scaleX: 1.2, scaleY: 0.8, x: -10, y: 0 }, null, { depth: 0, rotation: -0.4, scaleX: 0.8, scaleY: 1.2, x: 20, y: 12 }, null],
                  },
                ],
              },
            ],
          },
        ],
      },
      textures: [],
    },
  }
}

function createWideWalkAnimation(): SkelAnimManifest {
  return {
    sourceGraphicId: 'Graphic/WideWalkDemo',
    sourceGraphic: 'Graphic_WideWalkDemo',
    sourceVersion: 10,
    asset: {
      path: 'v1/skins/wide-walk-demo.skelanim',
      format: 'skelanim-zlib',
      bytes: 256,
    },
    fps: 12,
    defaultSequenceIndex: 0,
    defaultFrameIndex: 0,
    sequences: [
      { sequenceIndex: 0, pieceCount: 1, firstRenderableFrameIndex: 0, frameCount: 4, bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } },
      { sequenceIndex: 1, pieceCount: 1, firstRenderableFrameIndex: 0, frameCount: 4, bounds: { minX: 0, minY: 0, maxX: 140, maxY: 100 } },
    ],
  }
}

function createWideWalkPreparedEntry(): PreparedSkelAnimEntry {
  const piece = { pieceIndex: 0, textureId: 1, sourceX: 0, sourceY: 0, sourceWidth: 100, sourceHeight: 100, centerX: 0, centerY: 0 }

  return {
    assetPath: 'v1/skins/wide-walk-demo.skelanim',
    value: {
      data: {
        sheetWidth: 100,
        sheetHeight: 100,
        textures: [],
        characters: [
          {
            characterIndex: 0,
            name: 'WideWalkDemo',
            sequences: [
              {
                sequenceIndex: 0,
                length: 4,
                pieces: [
                  {
                    ...piece,
                    frames: [
                      { depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                      { depth: 0, rotation: 0.01, scaleX: 1, scaleY: 1, x: 0.25, y: 0 },
                      { depth: 0, rotation: -0.01, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                      { depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                    ],
                  },
                ],
              },
              {
                sequenceIndex: 1,
                length: 4,
                pieces: [
                  {
                    ...piece,
                    frames: [
                      { depth: 0, rotation: 0.05, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                      { depth: 0, rotation: 0.08, scaleX: 1, scaleY: 1, x: 40, y: 0 },
                      { depth: 0, rotation: -0.06, scaleX: 1, scaleY: 1, x: 20, y: 0 },
                      { depth: 0, rotation: -0.02, scaleX: 1, scaleY: 1, x: 40, y: 0 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      textures: [],
    },
  }
}

describe('skelanim canvas model', () => {
  it('只接受当前资源路径对应的准备结果和错误信息', () => {
    const preparedEntry = createPreparedEntry()
    const loadErrorEntry: SkelAnimLoadErrorEntry = {
      assetPath: 'v1/skins/other.skelanim',
      message: '其他资源失败',
    }

    expect(
      resolvePreparedAssetState('v1/skins/demo.skelanim', preparedEntry, loadErrorEntry),
    ).toMatchObject({
      prepared: preparedEntry.value,
      loadError: null,
      isLoading: false,
    })

    expect(resolvePreparedAssetState('v1/skins/missing.skelanim', preparedEntry, null)).toMatchObject({
      prepared: null,
      loadError: null,
      isLoading: true,
    })
  })

  it('优先使用 manifest bounds，并在缺失时回退到计算结果', () => {
    const prepared = createPreparedEntry().value

    expect(
      resolveSequenceSelection(
        createAnimation({ minX: 1, minY: 2, maxX: 50, maxY: 60 }),
        prepared,
      ),
    ).toMatchObject({
      startFrameIndex: 2,
      bounds: { minX: 1, minY: 2, maxX: 50, maxY: 60 },
    })

    expect(resolveSequenceSelection(createAnimation(), prepared)).toMatchObject({
      startFrameIndex: 2,
      bounds: { minX: 22, minY: 37, maxX: 42, maxY: 47 },
    })
  })

  it('walk intent 优先选择更像行走的稳定循环，而不是爆发动作', () => {
    const prepared = createWalkPreparedEntry().value

    expect(resolveSequenceSelection(createWalkAnimation(), prepared, 'walk')).toMatchObject({
      sequence: {
        sequenceIndex: 1,
      },
      startFrameIndex: 0,
      bounds: { minX: 2, minY: 0, maxX: 24, maxY: 20 },
    })
  })

  it('walk intent 找不到更合适候选时回退到 manifest 默认序列', () => {
    const prepared = createPreparedEntry().value

    const selection = resolveSequenceSelection(createAnimation(), prepared, 'walk')

    expect(selection).toMatchObject({
      sequence: {
        sequenceIndex: 7,
      },
      startFrameIndex: 2,
      bounds: { maxX: 42, maxY: 47 },
    })
    expect(selection?.bounds.minX).toBeCloseTo(20, 4)
    expect(selection?.bounds.minY).toBeCloseTo(35, 4)
  })

  it('walk intent 会收紧异常宽的 sequence viewport，避免立绘页人物显得偏小', () => {
    const prepared = createWideWalkPreparedEntry().value
    const selection = resolveSequenceSelection(createWideWalkAnimation(), prepared, 'walk')

    expect(selection).toMatchObject({
      sequence: {
        sequenceIndex: 1,
      },
      startFrameIndex: 0,
      bounds: { minX: 0, minY: 0, maxY: 100 },
    })
    expect(selection?.bounds.maxX).toBeCloseTo(112.46, 2)
  })

  it('给定固定 viewport 时会按静态立绘尺寸放大并贴底对齐 walk 动效', () => {
    expect(
      resolveSkelAnimViewportLayout(
        { minX: 0, minY: 0, maxX: 60, maxY: 120 },
        { minX: 0, minY: 0, maxX: 120, maxY: 180 },
      ),
    ).toMatchObject({
      contentScale: 1,
      offsetX: 0,
      offsetY: 0,
      contentBounds: { minX: 0, minY: 0, maxX: 120, maxY: 180 },
    })
  })

  it('只有显示尺寸真的大于动画逻辑尺寸时才提高栅格分辨率', () => {
    expect(
      resolveCanvasRasterScale(
        { minX: 0, minY: 0, maxX: 120, maxY: 180 },
        { width: 240, height: 360 },
      ),
    ).toBe(2)

    expect(
      resolveCanvasRasterScale(
        { minX: 0, minY: 0, maxX: 120, maxY: 180 },
        { width: 96, height: 144 },
      ),
    ).toBe(1)
  })

  it('根据播放模式和减少动态效果偏好决定是否播放', () => {
    expect(resolveSkelAnimPlayback('manual', false, true)).toBe(true)
    expect(resolveSkelAnimPlayback('manual', true, true)).toBe(false)
    expect(resolveSkelAnimPlayback('play', true, false)).toBe(false)
    expect(resolveSkelAnimPlayback('pause', false, true)).toBe(false)
  })

  it('按错误、动画、静态三种状态生成状态文案', () => {
    expect(
      buildSkelAnimStatusText({
        loadError: '资源损坏',
        showCanvas: false,
        prefersReducedMotion: false,
        labels,
      }),
    ).toBe('加载失败 · 资源损坏')

    expect(
      buildSkelAnimStatusText({
        loadError: null,
        showCanvas: true,
        prefersReducedMotion: true,
        labels,
      }),
    ).toBe('动态预览 · 减少动态效果')

    expect(
      buildSkelAnimStatusText({
        loadError: null,
        showCanvas: false,
        prefersReducedMotion: false,
        labels,
      }),
    ).toBe('静态预览')
  })
})
