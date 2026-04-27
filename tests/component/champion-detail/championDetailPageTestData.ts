import type {
  ChampionAnimation,
  ChampionDetail,
  ChampionIllustration,
  ChampionSpecializationGraphic,
  DataCollection,
} from '../../../src/domain/types'
import { championDetailBaseFixture } from './championDetailBaseFixture'
import { championDetailCatalogFixture } from './championDetailCatalogFixture'

export const defaultSectionTopMap = {
  specializations: 84,
  abilities: 460,
  loot: 860,
  legendary: 1060,
  feats: 1260,
  skins: 1460,
  'story-misc': 1660,
} as const

export function createDomRect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 0,
    height: 0,
    top,
    right: 0,
    bottom: top,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect
}

export const detailFixture: ChampionDetail = {
  ...championDetailBaseFixture,
  ...championDetailCatalogFixture,
}

export const illustrationFixture: DataCollection<ChampionIllustration> = {
  updatedAt: '2026-04-15',
  items: [
    {
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
    },
    {
      id: 'skin:5',
      championId: '7',
      skinId: '5',
      kind: 'skin',
      seat: 7,
      championName: {
        original: 'Minsc',
        display: '明斯克',
      },
      illustrationName: {
        original: 'Space Boo Expedition',
        display: '太空布布远征装',
      },
      portraitPath: 'v1/champion-portraits/7.png',
      sourceSlot: 'base',
      sourceGraphicId: '4472',
      sourceGraphic: 'Characters/Hero_Minsc_SpaceBoo',
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
        path: 'v1/champion-illustrations/skins/5.png',
        width: 1024,
        height: 1024,
        bytes: 65000,
        format: 'png',
      },
    },
  ],
}

export const animationFixture: DataCollection<ChampionAnimation> = {
  updatedAt: '2026-04-17',
  items: [],
}

export const animatedSkinFixture: ChampionAnimation = {
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
  sourceSlot: 'large',
  sourceGraphicId: '4471',
  sourceGraphic: 'Characters/Hero_Minsc_GiantBoo_2xup',
  sourceVersion: 1,
  fps: 24,
  defaultSequenceIndex: 0,
  defaultFrameIndex: 0,
  asset: {
    path: 'v1/champion-animations/skins/4.bin',
    bytes: 128,
    format: 'skelanim-zlib',
  },
  sequences: [
    {
      sequenceIndex: 0,
      frameCount: 2,
      pieceCount: 1,
      firstRenderableFrameIndex: 0,
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 1,
        maxY: 1,
      },
    },
  ],
}

export const specializationGraphicFixture: DataCollection<ChampionSpecializationGraphic> = {
  updatedAt: '2026-04-16',
  items: [
    {
      graphicId: '102',
      sourceGraphic: 'Icons/Ultimates/Icon_MinscUltimate',
      sourceVersion: 1,
      remotePath: 'mobile_assets/Icons/Ultimates/Icon_MinscUltimate',
      remoteUrl: 'https://master.idlechampions.com/~idledragons/mobile_assets/Icons/Ultimates/Icon_MinscUltimate',
      delivery: 'wrapped-png',
      uses: ['icon'],
      image: {
        path: 'v1/champion-specialization-graphics/102.png',
        width: 64,
        height: 64,
        bytes: 1024,
        format: 'png',
      },
    },
  ],
}
