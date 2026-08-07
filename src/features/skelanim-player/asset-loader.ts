import { loadBinaryData } from '../../data/client'
import { decodeSkelAnimBuffer } from './browser-codec'
import type { PreparedSkelAnimData } from './types'

// ponytail: FIFO 上限防止解码纹理无限累积；用户一次浏览的英雄动画远小于此值
const MAX_CACHE_ENTRIES = 12

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

  evictOldestPreparedSkelAnim()

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

function disposePreparedData(data: PreparedSkelAnimData) {
  for (const texture of data.textures) {
    const image = texture.image as { close?: () => void }
    if (typeof image.close === 'function') {
      image.close()
    }
  }
}

function evictOldestPreparedSkelAnim() {
  if (preparedCache.size < MAX_CACHE_ENTRIES) {
    return
  }

  const oldestKey = preparedCache.keys().next().value
  if (oldestKey == null) {
    return
  }

  const pending = preparedCache.get(oldestKey)
  preparedCache.delete(oldestKey)
  pending?.then(disposePreparedData, () => {})
}

export async function disposeAllPreparedSkelAnim() {
  const entries = [...preparedCache.values()]
  preparedCache.clear()
  await Promise.all(
    entries.map((entry) => entry.then(disposePreparedData, () => {})),
  )
}

export function readReducedMotionPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
