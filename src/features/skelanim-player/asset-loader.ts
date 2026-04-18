import { loadBinaryData } from '../../data/client'
import { decodeSkelAnimBuffer } from './browser-codec'
import type { PreparedSkelAnimData } from './types'

const preparedCache = new Map<string, Promise<PreparedSkelAnimData>>()

function toArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer
}

async function loadTextureImage(bytes: Uint8Array): Promise<CanvasImageSource> {
  const blob = new Blob([toArrayBuffer(bytes)], { type: 'image/png' })

  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob)
  }

  const objectUrl = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('PNG 纹理加载失败'))
    }
    image.src = objectUrl
  })
}

export async function prepareSkelAnim(assetPath: string) {
  const cached = preparedCache.get(assetPath)

  if (cached) {
    return cached
  }

  const pending = (async () => {
    const rawBuffer = await loadBinaryData(assetPath)
    const data = await decodeSkelAnimBuffer(rawBuffer)
    const textures = await Promise.all(
      data.textures.map(async (texture) => ({
        textureId: texture.textureId,
        image: await loadTextureImage(texture.bytes),
      })),
    )

    return { data, textures }
  })()

  preparedCache.set(assetPath, pending)
  return pending
}

export function readReducedMotionPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
