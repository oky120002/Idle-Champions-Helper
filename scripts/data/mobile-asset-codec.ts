import zlib from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export interface GraphicAsset {
  delivery: string
  graphicId: string
}

export interface PngDimensions {
  width: number
  height: number
}

export interface DecodedGraphic {
  delivery: string
  buffer: Buffer
}

export function findPngSignatureOffset(buffer: Buffer): number {
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

export function trimPngToIend(buffer: Buffer): Buffer {
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

export function extractWrappedPngBuffer(buffer: Buffer): Buffer {
  const pngOffset = findPngSignatureOffset(buffer)

  if (pngOffset < 0) {
    throw new Error('资源中未找到 PNG 数据头')
  }

  return trimPngToIend(buffer.subarray(pngOffset))
}

export function decodeRemoteGraphicBuffer(asset: GraphicAsset, rawBuffer: Buffer): Buffer {
  if (asset.delivery === 'wrapped-png') {
    return extractWrappedPngBuffer(rawBuffer)
  }

  if (asset.delivery === 'zlib-png') {
    const inflated = zlib.inflateSync(rawBuffer)
    return extractWrappedPngBuffer(inflated)
  }

  throw new Error(`暂不支持解析 ${asset.delivery} 资源`)
}

const GRAPHIC_DELIVERY_FALLBACKS = ['wrapped-png', 'zlib-png']

/**
 * 按标注 delivery 优先、再回退已知传输格式尝试解码；返回命中的 delivery 与 buffer。
 * 部分装备/专精图上游标注与实际格式不一致，需要逐个回退。
 */
export function decodeGraphicBufferWithFallback(
  asset: GraphicAsset,
  rawBuffer: Buffer,
): DecodedGraphic {
  const deliveryCandidates = Array.from(new Set([asset.delivery, ...GRAPHIC_DELIVERY_FALLBACKS]))

  for (const delivery of deliveryCandidates) {
    try {
      return { delivery, buffer: decodeRemoteGraphicBuffer({ ...asset, delivery }, rawBuffer) }
    } catch {
      // 标注不一致时回退到下一种已知传输格式
    }
  }

  throw new Error(`无法解析 graphic ${asset.graphicId}`)
}

export function readPngDimensions(buffer: Buffer): PngDimensions {
  if (buffer.length < 24 || findPngSignatureOffset(buffer) !== 0) {
    throw new Error('输入数据不是可识别的 PNG')
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

/**
 * 读取 buffer 指定偏移处的 PNG 尺寸（用于 wrapped 缓冲：先 findPngSignatureOffset 再读）。
 * 与 readPngDimensions 的区别：不要求 PNG 在偏移 0、越界返回 null 而非抛错。
 */
export function getPngDimensions(buffer: Buffer, offset: number): PngDimensions | null {
  if (offset < 0 || offset + 24 > buffer.length) {
    return null
  }

  return {
    width: buffer.readUInt32BE(offset + 16),
    height: buffer.readUInt32BE(offset + 20),
  }
}
