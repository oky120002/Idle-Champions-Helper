import { describe, expect, it } from 'vitest'
import { resolveSkinPreviewUrl } from '../../../src/pages/champion-detail/detail-card-model'
import type { ChampionIllustration } from '../../../src/domain/types'

function createSkinIllustration(): ChampionIllustration {
  return {
    id: 'skin:4',
    championId: '7',
    skinId: '4',
    kind: 'skin',
    seat: 7,
    championName: {
      original: 'Minsc',
      display: '明斯克',
    },
    illustrationName: {
      original: 'Giant Boo Costume',
      display: '巨型布布服装',
    },
    portraitPath: 'v1/champion-portraits/7.png',
    sourceSlot: 'large',
    sourceGraphicId: '4471',
    sourceGraphic: 'Characters/Hero_Minsc_GiantBoo_2xup',
    sourceVersion: 1,
    render: {
      pipeline: 'skelanim',
      sequenceIndex: 0,
      sequenceLength: 1,
      isStaticPose: true,
      frameIndex: 0,
      visiblePieceCount: 24,
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 1024,
        maxY: 1024,
      },
    },
    image: {
      path: 'v1/champion-illustrations/skins/4.png',
      width: 1024,
      height: 1024,
      bytes: 64000,
      format: 'png',
    },
  }
}

describe('detail-card-model', () => {
  it('优先返回站内动画导出的皮肤立绘路径', () => {
    expect(resolveSkinPreviewUrl(createSkinIllustration())).toBe('/data/v1/champion-illustrations/skins/4.png')
  })

  it('缺少本地皮肤立绘时不再回退英雄头像', () => {
    expect(resolveSkinPreviewUrl(null)).toBeNull()
  })
})
