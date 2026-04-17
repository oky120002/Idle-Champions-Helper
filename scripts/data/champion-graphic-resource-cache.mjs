import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { decodeRemoteGraphicBuffer, readPngDimensions } from './mobile-asset-codec.mjs'
import { decodeSkelAnimGraphicBuffer } from './skelanim-codec.mjs'
import { renderSkelAnimPoseToPngBuffer } from './skelanim-renderer.mjs'

export const DEFAULT_GRAPHIC_CACHE_DIR = 'tmp/idle-champions-graphic-cache'

function buildAssetCacheKey(asset) {
  return `${asset.graphicId}:${asset.sourceVersion ?? 'na'}:${asset.remotePath}`
}

function buildAssetCacheFileName(asset) {
  const digest = createHash('sha1').update(asset.remotePath).digest('hex').slice(0, 12)
  return `${asset.graphicId}-${asset.sourceVersion ?? 'na'}-${digest}.bin`
}

async function readBufferIfExists(filePath) {
  try {
    return await readFile(filePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export function isSkelAnimAsset(asset) {
  return asset.remotePath.includes('/Characters/')
}

export function resolvePreferredSequenceIndexes(asset, graphicDefById) {
  const graphicDef = graphicDefById.get(String(asset.graphicId))
  const sequenceOverride = graphicDef?.export_params?.sequence_override

  if (!Array.isArray(sequenceOverride) || sequenceOverride.length === 0) {
    return []
  }

  return sequenceOverride
    .map((value) => Number(value) - 1)
    .filter((value) => Number.isInteger(value) && value >= 0)
}

export function createChampionGraphicResourceCache(options = {}) {
  const cacheDir = path.resolve(options.cacheDir ?? DEFAULT_GRAPHIC_CACHE_DIR)
  const graphicDefById = options.graphicDefById ?? new Map()
  const rawBufferCache = new Map()
  const decodedPngCache = new Map()
  const skelAnimCache = new Map()
  const renderedPoseCache = new Map()
  let cacheDirPromise = null

  async function ensureCacheDir() {
    if (!cacheDirPromise) {
      cacheDirPromise = mkdir(cacheDir, { recursive: true })
    }

    await cacheDirPromise
  }

  async function readRawGraphicBuffer(asset) {
    const cacheKey = buildAssetCacheKey(asset)
    const cached = rawBufferCache.get(cacheKey)

    if (cached) {
      return cached
    }

    const pending = (async () => {
      const cacheFile = path.join(cacheDir, buildAssetCacheFileName(asset))
      const existing = await readBufferIfExists(cacheFile)

      if (existing) {
        return existing
      }

      const response = await fetch(asset.remoteUrl, { cache: 'no-store' })

      if (!response.ok) {
        throw new Error(`下载资源失败：HTTP ${response.status}`)
      }

      const rawBuffer = Buffer.from(await response.arrayBuffer())
      await ensureCacheDir()
      await writeFile(cacheFile, rawBuffer)
      return rawBuffer
    })()

    rawBufferCache.set(cacheKey, pending)
    return pending
  }

  async function readDecodedPngBuffer(asset) {
    if (isSkelAnimAsset(asset)) {
      throw new Error(`资源 ${asset.graphicId} 是 SkelAnim，不能按静态 PNG 解码`)
    }

    const cacheKey = buildAssetCacheKey(asset)
    const cached = decodedPngCache.get(cacheKey)

    if (cached) {
      return cached
    }

    const pending = readRawGraphicBuffer(asset).then((rawBuffer) => decodeRemoteGraphicBuffer(asset, rawBuffer))
    decodedPngCache.set(cacheKey, pending)
    return pending
  }

  async function readSkelAnimGraphic(asset) {
    if (!isSkelAnimAsset(asset)) {
      throw new Error(`资源 ${asset.graphicId} 不是 SkelAnim`)
    }

    const cacheKey = buildAssetCacheKey(asset)
    const cached = skelAnimCache.get(cacheKey)

    if (cached) {
      return cached
    }

    const pending = readRawGraphicBuffer(asset).then((rawBuffer) => decodeSkelAnimGraphicBuffer(asset, rawBuffer))
    skelAnimCache.set(cacheKey, pending)
    return pending
  }

  async function renderIllustrationCandidate(candidate) {
    const { asset } = candidate

    if (isSkelAnimAsset(asset)) {
      const preferredSequenceIndexes = resolvePreferredSequenceIndexes(asset, graphicDefById)
      const renderCacheKey = `${buildAssetCacheKey(asset)}::${preferredSequenceIndexes.join(',')}`
      const cached = renderedPoseCache.get(renderCacheKey)

      if (cached) {
        return cached
      }

      const pending = readSkelAnimGraphic(asset).then((skelAnim) => renderSkelAnimPoseToPngBuffer(skelAnim, {
        preferredSequenceIndexes,
      }))
      renderedPoseCache.set(renderCacheKey, pending)
      const rendered = await pending

      return {
        asset,
        bytes: rendered.bytes,
        width: rendered.width,
        height: rendered.height,
        render: {
          pipeline: 'skelanim',
          sequenceIndex: rendered.render.sequenceIndex,
          sequenceLength: rendered.render.sequenceLength,
          isStaticPose: rendered.render.isStaticPose,
          frameIndex: rendered.render.frameIndex,
          visiblePieceCount: rendered.render.visiblePieceCount,
          bounds: rendered.render.bounds,
        },
      }
    }

    const decodedBuffer = await readDecodedPngBuffer(asset)
    const dimensions = readPngDimensions(decodedBuffer)

    return {
      asset,
      bytes: decodedBuffer,
      width: dimensions.width,
      height: dimensions.height,
      render: {
        pipeline: 'decoded-png',
        sequenceIndex: null,
        sequenceLength: null,
        isStaticPose: null,
        frameIndex: null,
        visiblePieceCount: null,
        bounds: null,
      },
    }
  }

  return {
    cacheDir,
    readRawGraphicBuffer,
    readDecodedPngBuffer,
    readSkelAnimGraphic,
    renderIllustrationCandidate,
  }
}
