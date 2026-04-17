import type { LocalizedText } from './common'

export interface ChampionPortrait {
  path: string
  sourceGraphic: string
  sourceVersion: number | null
}

export type RemoteGraphicDelivery = 'wrapped-png' | 'zlib-png' | 'unknown'

export interface RemoteGraphicAsset {
  graphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  remotePath: string
  remoteUrl: string
  delivery: RemoteGraphicDelivery
  uses: string[]
}

export interface ChampionSpecializationGraphic {
  graphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  remotePath: string
  remoteUrl: string
  delivery: RemoteGraphicDelivery
  uses: string[]
  image: {
    path: string
    width: number
    height: number
    bytes: number
    format: 'png'
  }
}

export interface ChampionVisualPortrait {
  localPath: string
  remote: RemoteGraphicAsset
}

export interface ChampionSkinVisual {
  id: string
  name: LocalizedText
  portrait: RemoteGraphicAsset | null
  base: RemoteGraphicAsset | null
  large: RemoteGraphicAsset | null
  xl: RemoteGraphicAsset | null
}

export interface ChampionVisual {
  championId: string
  seat: number
  name: LocalizedText
  portrait: ChampionVisualPortrait | null
  base: RemoteGraphicAsset | null
  skins: ChampionSkinVisual[]
}

export type ChampionIllustrationKind = 'hero-base' | 'skin'

export type ChampionIllustrationSourceSlot = 'base' | 'large' | 'xl'

export interface ChampionIllustrationImage {
  path: string
  width: number
  height: number
  bytes: number
  format: 'png'
}

export interface ChampionIllustrationRenderBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface ChampionIllustrationRender {
  pipeline: 'skelanim' | 'decoded-png'
  sequenceIndex: number | null
  sequenceLength: number | null
  isStaticPose: boolean | null
  frameIndex: number | null
  visiblePieceCount: number | null
  bounds: ChampionIllustrationRenderBounds | null
}

export interface ChampionIllustrationManualOverride {
  matchedBy: Array<'championId' | 'graphicId' | 'skinId'>
  requestedSlot: ChampionIllustrationSourceSlot | null
  candidateMatchedSlot: boolean | null
  preferredSequenceIndexes: number[]
  preferredFrameIndexes: number[]
  notes: string[]
}

export interface ChampionIllustration {
  id: string
  championId: string
  skinId: string | null
  kind: ChampionIllustrationKind
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  portraitPath: string | null
  sourceSlot: ChampionIllustrationSourceSlot
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number | null
  manualOverride?: ChampionIllustrationManualOverride | null
  render: ChampionIllustrationRender
  image: ChampionIllustrationImage
}

export interface PetImage {
  path: string
  width: number
  height: number
  bytes: number
  format: 'png'
}
