import { describe, expect, it } from 'vitest'
import type { SkelAnimManifest } from '../../../src/domain/types'
import {
  buildSkelAnimStatusText,
  resolvePreparedAssetState,
  resolveSequenceSelection,
  resolveSkelAnimPlayback,
} from '../../../src/features/skelanim-player/skelanim-canvas-model'
import type {
  PreparedSkelAnimEntry,
  SkelAnimCanvasLabels,
  SkelAnimLoadErrorEntry,
} from '../../../src/features/skelanim-player/types'

const labels: SkelAnimCanvasLabels = {
  loading: '加载中',
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
