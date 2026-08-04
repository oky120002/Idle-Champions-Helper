import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { decodeRemoteGraphicBuffer, readPngDimensions } from './mobile-asset-codec.ts'
import { decodeSkelAnimGraphicBuffer } from './skelanim-codec.ts'
import type { SkelAnimGraphic } from './skelanim-codec.ts'
import { renderSkelAnimPoseToPngBuffer } from './skelanim-renderer.ts'
import type { RemoteGraphicAsset } from './champion-asset-helpers.ts'

export const DEFAULT_GRAPHIC_CACHE_DIR = 'tmp/idle-champions-graphic-cache'

type GraphicDefMap = Map<string, Record<string, unknown>>

interface RenderedCandidateRender {
  pipeline: 'skelanim' | 'decoded-png'
  sequenceIndex: number | null
  sequenceLength: number | null
  isStaticPose: boolean | null
  frameIndex: number | null
  visiblePieceCount: number | null
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null
}

export interface RenderedCandidate {
  asset: RemoteGraphicAsset
  bytes: Buffer
  width: number
  height: number
  render: RenderedCandidateRender
}

export interface IllustrationCandidate {
  asset: RemoteGraphicAsset
}

function buildAssetCacheKey(asset: RemoteGraphicAsset): string {
  return `${asset.graphicId}:${asset.sourceVersion ?? 'na'}:${asset.remotePath}`
}

function buildAssetCacheFileName(asset: RemoteGraphicAsset): string {
  const digest = createHash('sha1').update(asset.remotePath).digest('hex').slice(0, 12)
  return `${asset.graphicId}-${asset.sourceVersion ?? 'na'}-${digest}.bin`
}

async function readBufferExists(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath)
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'ENOENT'
    ) {
      return null
    }

    throw error
  }
}

export function isSkelAnimAsset(asset: RemoteGraphicAsset): boolean {
  return asset.remotePath.includes('/Characters/')
}

export function resolvePreferredSequenceIndexes(asset: RemoteGraphicAsset, graphicDefById: GraphicDefMap): number[] {
  const graphicDef = graphicDefById.get(asset.graphicId) as
    | { export_params?: { sequence_override?: unknown[] } }
    | undefined
  const sequenceOverride = graphicDef?.export_params?.sequence_override

  if (!Array.isArray(sequenceOverride) || sequenceOverride.length === 0) {
    return []
  }

  return sequenceOverride
    .map((value) => Number(value) - 1)
    .filter((value) => Number.isInteger(value) && value >= 0)
}

export interface ChampionGraphicResourceCacheOptions {
  cacheDir?: string
  graphicDefById?: GraphicDefMap
}

export interface ChampionGraphicResourceCache {
  cacheDir: string
  readRawGraphicBuffer: (asset: RemoteGraphicAsset) => Promise<Buffer>
  readDecodedPngBuffer: (asset: RemoteGraphicAsset) => Promise<Buffer>
  readSkelAnimGraphic: (asset: RemoteGraphicAsset) => Promise<SkelAnimGraphic>
  renderIllustrationCandidate: (candidate: IllustrationCandidate) => Promise<RenderedCandidate>
}

export function createChampionGraphicResourceCache(
  options: ChampionGraphicResourceCacheOptions = {},
): ChampionGraphicResourceCache {
  const cacheDir = path.resolve(options.cacheDir ?? DEFAULT_GRAPHIC_CACHE_DIR)
  const graphicDefById = options.graphicDefById ?? new Map<string, Record<string, unknown>>()
  const rawBufferCache = new Map<string, Promise<Buffer>>()
  const decodedPngCache = new Map<string, Promise<Buffer>>()
  const skelAnimCache = new Map<string, Promise<SkelAnimGraphic>>()
  const renderedPoseCache = new Map<string, Promise<RenderedCandidate>>()
  let cacheDirPromise: Promise<unknown> | null = null

  async function ensureCacheDir(): Promise<void> {
    if (!cacheDirPromise) {
      cacheDirPromise = mkdir(cacheDir, { recursive: true })
    }

    await cacheDirPromise
  }

  async function readRawGraphicBuffer(asset: RemoteGraphicAsset): Promise<Buffer> {
    const cacheKey = buildAssetCacheKey(asset)
    const cached = rawBufferCache.get(cacheKey)

    if (cached) {
      return cached
    }

    const pending = (async () => {
      const cacheFile = path.join(cacheDir, buildAssetCacheFileName(asset))
      const existing = await readBufferExists(cacheFile)

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

  async function readDecodedPngBuffer(asset: RemoteGraphicAsset): Promise<Buffer> {
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

  async function readSkelAnimGraphic(asset: RemoteGraphicAsset): Promise<SkelAnimGraphic> {
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

  async function renderIllustrationCandidate(candidate: IllustrationCandidate): Promise<RenderedCandidate> {
    const { asset } = candidate

    if (isSkelAnimAsset(asset)) {
      const preferredSequenceIndexes = resolvePreferredSequenceIndexes(asset, graphicDefById)
      const renderCacheKey = `${buildAssetCacheKey(asset)}::${preferredSequenceIndexes.join(',')}`
      const cached = renderedPoseCache.get(renderCacheKey)

      if (cached) {
        return cached
      }

      // 缓存命中需与首次返回同一 RenderedCandidate 形状（含 asset/pipeline），
      // 故 pending 直接产出 RenderedCandidate，而非中间的 RenderedSkelAnimPose。
      const pending: Promise<RenderedCandidate> = readSkelAnimGraphic(asset)
        .then((skelAnim) => renderSkelAnimPoseToPngBuffer(skelAnim, { preferredSequenceIndexes }))
        .then((rendered) => ({
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
        }))
      renderedPoseCache.set(renderCacheKey, pending)
      return pending
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
