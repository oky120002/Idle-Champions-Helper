import { describe, expect, it } from 'vitest'
import {
  buildMobileAssetPath,
  buildMobileAssetUrl,
  buildRemoteGraphicAsset,
  inferGraphicDelivery,
} from '../../../scripts/data/champion-asset-helpers.mjs'

describe('champion asset helpers', () => {
  it('为 portrait 资源推断 wrapped-png 并生成远端地址', () => {
    const asset = buildRemoteGraphicAsset({
      id: 13,
      graphic: 'Portraits/Portrait_Bruenor',
      v: 7,
      export_params: {
        uses: ['portrait', 'champion_portrait'],
      },
    })

    expect(asset).toEqual({
      graphicId: '13',
      sourceGraphic: 'Portraits/Portrait_Bruenor',
      sourceVersion: 7,
      remotePath: 'mobile_assets/Portraits/Portrait_Bruenor',
      remoteUrl: 'https://master.idlechampions.com/~idledragons/mobile_assets/Portraits/Portrait_Bruenor',
      delivery: 'wrapped-png',
      uses: ['portrait', 'champion_portrait'],
    })
  })

  it('为角色立绘资源推断 zlib-png', () => {
    expect(
      inferGraphicDelivery({
        graphic: 'Characters/Hero_BruenorPirate_4xup',
        export_params: {
          uses: ['crusader'],
        },
      }),
    ).toBe('zlib-png')

    expect(buildMobileAssetPath('Characters/Event/Hero_Kthriss_VentureCasual')).toBe(
      'mobile_assets/Characters/Event/Hero_Kthriss_VentureCasual',
    )
    expect(buildMobileAssetUrl('Characters/Hero_Bruenor')).toBe(
      'https://master.idlechampions.com/~idledragons/mobile_assets/Characters/Hero_Bruenor',
    )
  })
})
