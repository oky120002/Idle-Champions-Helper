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
  animation: SkelAnimManifest | null
  fallbackSrc: string | null
  alt: string
  labels: SkelAnimCanvasLabels
  viewportBounds?: SkelAnimBounds | null
  className?: string
  showStatus?: boolean
  showControls?: boolean
  playbackMode?: 'manual' | 'play' | 'pause'
  sequenceIntent?: 'default' | 'walk'
}

export interface PreparedSkelAnimEntry {
  assetPath: string
  value: PreparedSkelAnimData
}

export interface SkelAnimLoadErrorEntry {
  assetPath: string
  message: string
}
