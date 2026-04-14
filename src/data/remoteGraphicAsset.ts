import type { RemoteGraphicAsset } from '../domain/types'

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const IEND_SIGNATURE = new Uint8Array([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])

const objectUrlCache = new Map<string, string>()

function sliceArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function indexOfBytes(buffer: Uint8Array, pattern: Uint8Array, start = 0): number {
  for (let index = start; index <= buffer.length - pattern.length; index += 1) {
    let matched = true

    for (let offset = 0; offset < pattern.length; offset += 1) {
      if (buffer[index + offset] !== pattern[offset]) {
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

export function findPngSignatureOffset(buffer: Uint8Array): number {
  return indexOfBytes(buffer, PNG_SIGNATURE)
}

export function trimPngBytesToIend(buffer: Uint8Array): Uint8Array {
  const endOffset = indexOfBytes(buffer, IEND_SIGNATURE, PNG_SIGNATURE.length)

  if (endOffset < 0) {
    return buffer
  }

  return buffer.slice(0, endOffset + IEND_SIGNATURE.length)
}

export function extractWrappedPngBytes(buffer: Uint8Array): Uint8Array {
  const startOffset = findPngSignatureOffset(buffer)

  if (startOffset < 0) {
    throw new Error('资源中未找到 PNG 数据头')
  }

  return trimPngBytesToIend(buffer.slice(startOffset))
}

export async function inflateDeflateBytes(buffer: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持实时解压远端立绘资源')
  }

  const stream = new Blob([sliceArrayBuffer(buffer)]).stream().pipeThrough(new DecompressionStream('deflate'))
  const decompressed = await new Response(stream).arrayBuffer()

  return new Uint8Array(decompressed)
}

export async function decodeRemoteGraphicBytes(
  asset: RemoteGraphicAsset,
  rawBytes: Uint8Array,
): Promise<Uint8Array> {
  if (asset.delivery === 'wrapped-png') {
    return extractWrappedPngBytes(rawBytes)
  }

  if (asset.delivery === 'zlib-png') {
    const inflated = await inflateDeflateBytes(rawBytes)
    return extractWrappedPngBytes(inflated)
  }

  throw new Error(`暂不支持解析 ${asset.delivery} 资源`)
}

function buildObjectUrlCacheKey(asset: RemoteGraphicAsset): string {
  return [asset.remoteUrl, asset.sourceVersion ?? 'null', asset.delivery].join('|')
}

export async function loadRemoteGraphicAssetUrl(asset: RemoteGraphicAsset): Promise<string> {
  const cacheKey = buildObjectUrlCacheKey(asset)
  const cached = objectUrlCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const response = await fetch(asset.remoteUrl, { cache: 'force-cache' })

  if (!response.ok) {
    throw new Error(`下载资源失败：HTTP ${response.status}`)
  }

  const decodedBytes = await decodeRemoteGraphicBytes(asset, new Uint8Array(await response.arrayBuffer()))
  const objectUrl = URL.createObjectURL(new Blob([sliceArrayBuffer(decodedBytes)], { type: 'image/png' }))

  objectUrlCache.set(cacheKey, objectUrl)
  return objectUrl
}

export function clearRemoteGraphicAssetCache(): void {
  objectUrlCache.forEach((url) => URL.revokeObjectURL(url))
  objectUrlCache.clear()
}
