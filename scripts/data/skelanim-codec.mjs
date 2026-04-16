import zlib from 'node:zlib'

function readUInt32LE(buffer, offsetRef) {
  const value = buffer.readUInt32LE(offsetRef.offset)
  offsetRef.offset += 4
  return value
}

function readInt32LE(buffer, offsetRef) {
  const value = buffer.readInt32LE(offsetRef.offset)
  offsetRef.offset += 4
  return value
}

function readInt16LE(buffer, offsetRef) {
  const value = buffer.readInt16LE(offsetRef.offset)
  offsetRef.offset += 2
  return value
}

function readDoubleLE(buffer, offsetRef) {
  const value = buffer.readDoubleLE(offsetRef.offset)
  offsetRef.offset += 8
  return value
}

function readBoolean(buffer, offsetRef) {
  const value = buffer[offsetRef.offset] !== 0
  offsetRef.offset += 1
  return value
}

function readString(buffer, offsetRef) {
  const length = readInt16LE(buffer, offsetRef)

  if (length === 0) {
    return ''
  }

  const value = buffer.subarray(offsetRef.offset, offsetRef.offset + length).toString('utf8')
  offsetRef.offset += length
  return value
}

export function inflateGraphicContainerBuffer(asset, rawBuffer) {
  if (asset.delivery === 'zlib-png') {
    return zlib.inflateSync(rawBuffer)
  }

  if (asset.delivery === 'wrapped-png') {
    return rawBuffer
  }

  throw new Error(`暂不支持解析 ${asset.delivery} 资源容器`)
}

export function parseSkelAnimBuffer(buffer) {
  const offsetRef = { offset: 0 }
  const sheetWidth = readUInt32LE(buffer, offsetRef)
  const sheetHeight = readUInt32LE(buffer, offsetRef)
  const textureCount = readUInt32LE(buffer, offsetRef)
  const textures = []

  for (let textureIndex = 0; textureIndex < textureCount; textureIndex += 1) {
    const bytesLength = readUInt32LE(buffer, offsetRef)
    const pngBytes = buffer.subarray(offsetRef.offset, offsetRef.offset + bytesLength)
    offsetRef.offset += bytesLength
    textures.push({
      textureId: textureIndex,
      bytes: pngBytes,
    })
  }

  const characterCount = readUInt32LE(buffer, offsetRef)
  const characters = []

  for (let characterIndex = 0; characterIndex < characterCount; characterIndex += 1) {
    const name = readString(buffer, offsetRef)
    const sequenceCount = readUInt32LE(buffer, offsetRef)
    const sequences = []

    for (let sequenceIndex = 0; sequenceIndex < sequenceCount; sequenceIndex += 1) {
      const length = readUInt32LE(buffer, offsetRef)
      const pieceCount = readUInt32LE(buffer, offsetRef)
      const pieces = []

      for (let pieceIndex = 0; pieceIndex < pieceCount; pieceIndex += 1) {
        const textureId = readUInt32LE(buffer, offsetRef)
        const sourceX = readUInt32LE(buffer, offsetRef)
        const sourceY = readUInt32LE(buffer, offsetRef)
        const sourceWidth = readUInt32LE(buffer, offsetRef)
        const sourceHeight = readUInt32LE(buffer, offsetRef)
        const centerX = readInt32LE(buffer, offsetRef)
        const centerY = readInt32LE(buffer, offsetRef)
        const frames = []

        for (let frameIndex = 0; frameIndex < length; frameIndex += 1) {
          if (!readBoolean(buffer, offsetRef)) {
            frames.push(null)
            continue
          }

          const depth = readUInt32LE(buffer, offsetRef)
          const rotation = readDoubleLE(buffer, offsetRef)
          const scaleX = readDoubleLE(buffer, offsetRef)
          const scaleY = readDoubleLE(buffer, offsetRef)
          const x = readDoubleLE(buffer, offsetRef)
          const y = readDoubleLE(buffer, offsetRef)

          frames.push({
            depth,
            rotation,
            scaleX,
            scaleY,
            x,
            y,
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

      sequences.push({
        sequenceIndex,
        length,
        pieces,
      })
    }

    characters.push({
      characterIndex,
      name,
      sequences,
    })
  }

  return {
    sheetWidth,
    sheetHeight,
    textures,
    characters,
  }
}

export function decodeSkelAnimGraphicBuffer(asset, rawBuffer) {
  return parseSkelAnimBuffer(inflateGraphicContainerBuffer(asset, rawBuffer))
}
