import type { SkelAnimManifest } from '../../domain/types'

export interface SkelAnimTexture {
  textureId: number
  bytes: Uint8Array
}

export interface SkelAnimFrame {
  depth: number
  rotation: number
  scaleX: number
  scaleY: number
  x: number
  y: number
}

export interface SkelAnimPiece {
  pieceIndex: number
  textureId: number
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  centerX: number
  centerY: number
  frames: Array<SkelAnimFrame | null>
}

export interface SkelAnimSequence {
  sequenceIndex: number
  length: number
  pieces: SkelAnimPiece[]
}

export interface SkelAnimCharacter {
  characterIndex: number
  name: string
  sequences: SkelAnimSequence[]
}

export interface SkelAnimData {
  sheetWidth: number
  sheetHeight: number
  textures: SkelAnimTexture[]
  characters: SkelAnimCharacter[]
}

export interface SkelAnimBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface PreparedSkelAnimTexture {
  textureId: number
  image: CanvasImageSource
}

export interface PreparedSkelAnimData {
  data: SkelAnimData
  textures: PreparedSkelAnimTexture[]
}

export interface SkelAnimCanvasLabels {
  play: string
  pause: string
  reducedMotion: string
  error: string
  animated: string
  fallback: string
}

export interface SkelAnimCanvasProps {
  readonly animation: SkelAnimManifest | null
  readonly fallbackSrc: string | null
  readonly alt: string
  readonly labels: SkelAnimCanvasLabels
  readonly viewportBounds?: SkelAnimBounds | null
  readonly className?: string
  readonly showStatus?: boolean
  readonly showControls?: boolean
  readonly playbackMode?: 'manual' | 'play' | 'pause'
  readonly sequenceIntent?: 'default' | 'walk'
}

export interface PreparedSkelAnimEntry {
  assetPath: string
  value: PreparedSkelAnimData
}

export interface SkelAnimLoadErrorEntry {
  assetPath: string
  message: string
}
