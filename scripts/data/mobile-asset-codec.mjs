import zlib from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function findPngSignatureOffset(buffer) {
  for (let index = 0; index <= buffer.length - PNG_SIGNATURE.length; index += 1) {
    let matched = true

    for (let offset = 0; offset < PNG_SIGNATURE.length; offset += 1) {
      if (buffer[index + offset] !== PNG_SIGNATURE[offset]) {
        matched = false
        break
      }
    }

    if (matched) {
      return index
    }
  }

  return -1
}

export function trimPngToIend(buffer) {
  let cursor = 8

  while (cursor + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(cursor)
    const chunkType = buffer.subarray(cursor + 4, cursor + 8).toString('ascii')
    const nextCursor = cursor + 12 + chunkLength

    if (nextCursor > buffer.length) {
      return buffer
    }

    cursor = nextCursor

    if (chunkType === 'IEND') {
      return buffer.subarray(0, cursor)
    }
  }

  return buffer
}

export function extractWrappedPngBuffer(buffer) {
  const pngOffset = findPngSignatureOffset(buffer)

  if (pngOffset < 0) {
    throw new Error('资源中未找到 PNG 数据头')
  }

  return trimPngToIend(buffer.subarray(pngOffset))
}

export function decodeRemoteGraphicBuffer(asset, rawBuffer) {
  if (asset.delivery === 'wrapped-png') {
    return extractWrappedPngBuffer(rawBuffer)
  }

  if (asset.delivery === 'zlib-png') {
    const inflated = zlib.inflateSync(rawBuffer)
    return extractWrappedPngBuffer(inflated)
  }

  throw new Error(`暂不支持解析 ${asset.delivery} 资源`)
}

export function readPngDimensions(buffer) {
  if (buffer.length < 24 || findPngSignatureOffset(buffer) !== 0) {
    throw new Error('输入数据不是可识别的 PNG')
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}
