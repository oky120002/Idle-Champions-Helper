import { unzlibSync } from 'fflate'
import type { SkelAnimCharacter, SkelAnimData, SkelAnimFrame, SkelAnimPiece, SkelAnimSequence } from './types'

const textDecoder = new TextDecoder('utf-8')

function toArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer
}

function readUInt32LE(view: DataView, offsetRef: { offset: number }) {
  const value = view.getUint32(offsetRef.offset, true)
  offsetRef.offset += 4
  return value
}

function readInt32LE(view: DataView, offsetRef: { offset: number }) {
  const value = view.getInt32(offsetRef.offset, true)
  offsetRef.offset += 4
  return value
}

function readInt16LE(view: DataView, offsetRef: { offset: number }) {
  const value = view.getInt16(offsetRef.offset, true)
  offsetRef.offset += 2
  return value
}

function readFloat64LE(view: DataView, offsetRef: { offset: number }) {
  const value = view.getFloat64(offsetRef.offset, true)
  offsetRef.offset += 8
  return value
}

function readBoolean(view: DataView, offsetRef: { offset: number }) {
  const value = view.getUint8(offsetRef.offset) !== 0
  offsetRef.offset += 1
  return value
}

function readString(view: DataView, bytes: Uint8Array, offsetRef: { offset: number }) {
  const length = readInt16LE(view, offsetRef)

  if (length === 0) {
    return ''
  }

  const value = textDecoder.decode(bytes.subarray(offsetRef.offset, offsetRef.offset + length))
  offsetRef.offset += length
  return value
}

async function inflateContainer(bytes: Uint8Array) {
  if (
    typeof DecompressionStream === 'function' &&
    typeof Blob !== 'undefined' &&
    typeof Blob.prototype.stream === 'function'
  ) {
    try {
      const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('deflate'))
      const arrayBuffer = await new Response(stream).arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch {
      // Fall through to the JS inflater when the browser runtime only partially
      // implements the stream-based decompression primitives.
    }
  }

  return unzlibSync(bytes)
}

function parseSequence(view: DataView, offsetRef: { offset: number }, sequenceIndex: number): SkelAnimSequence {
  const length = readUInt32LE(view, offsetRef)
  const pieceCount = readUInt32LE(view, offsetRef)
  const pieces: SkelAnimPiece[] = []

  for (let pieceIndex = 0; pieceIndex < pieceCount; pieceIndex += 1) {
    const textureId = readUInt32LE(view, offsetRef)
    const sourceX = readUInt32LE(view, offsetRef)
    const sourceY = readUInt32LE(view, offsetRef)
    const sourceWidth = readUInt32LE(view, offsetRef)
    const sourceHeight = readUInt32LE(view, offsetRef)
    const centerX = readInt32LE(view, offsetRef)
    const centerY = readInt32LE(view, offsetRef)
    const frames: Array<SkelAnimFrame | null> = []

    for (let frameIndex = 0; frameIndex < length; frameIndex += 1) {
      if (!readBoolean(view, offsetRef)) {
        frames.push(null)
        continue
      }

      frames.push({
        depth: readUInt32LE(view, offsetRef),
        rotation: readFloat64LE(view, offsetRef),
        scaleX: readFloat64LE(view, offsetRef),
        scaleY: readFloat64LE(view, offsetRef),
        x: readFloat64LE(view, offsetRef),
        y: readFloat64LE(view, offsetRef),
      })
    }

    pieces.push({
      pieceIndex,
      textureId,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      centerX,
      centerY,
      frames,
    })
  }

  return {
    sequenceIndex,
    length,
    pieces,
  }
}

function parseCharacter(view: DataView, bytes: Uint8Array, offsetRef: { offset: number }, characterIndex: number): SkelAnimCharacter {
  const name = readString(view, bytes, offsetRef)
  const sequenceCount = readUInt32LE(view, offsetRef)
  const sequences: SkelAnimSequence[] = []

  for (let sequenceIndex = 0; sequenceIndex < sequenceCount; sequenceIndex += 1) {
    sequences.push(parseSequence(view, offsetRef, sequenceIndex))
  }

  return {
    characterIndex,
    name,
    sequences,
  }
}

function parseInflatedBuffer(bytes: Uint8Array): SkelAnimData {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const offsetRef = { offset: 0 }
  const sheetWidth = readUInt32LE(view, offsetRef)
  const sheetHeight = readUInt32LE(view, offsetRef)
  const textureCount = readUInt32LE(view, offsetRef)
  const textures = []

  for (let textureIndex = 0; textureIndex < textureCount; textureIndex += 1) {
    const bytesLength = readUInt32LE(view, offsetRef)
    const textureBytes = bytes.slice(offsetRef.offset, offsetRef.offset + bytesLength)
    offsetRef.offset += bytesLength
    textures.push({
      textureId: textureIndex,
      bytes: textureBytes,
    })
  }

  const characterCount = readUInt32LE(view, offsetRef)
  const characters: SkelAnimCharacter[] = []

  for (let characterIndex = 0; characterIndex < characterCount; characterIndex += 1) {
    characters.push(parseCharacter(view, bytes, offsetRef, characterIndex))
  }

  return {
    sheetWidth,
    sheetHeight,
    textures,
    characters,
  }
}

export async function decodeSkelAnimBuffer(rawBuffer: ArrayBuffer) {
  const inflatedBytes = await inflateContainer(new Uint8Array(rawBuffer))
  return parseInflatedBuffer(inflatedBytes)
}
