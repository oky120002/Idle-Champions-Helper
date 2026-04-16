import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { decodeSkelAnimGraphicBuffer } from './skelanim-codec.mjs'
import { computeSkelAnimFrameBounds, renderSkelAnimPoseToPngBuffer } from './skelanim-renderer.mjs'
import { loadChampionIllustrationOverrides } from './champion-illustration-overrides.mjs'
import { analyzeIllustrationAlphaPngBuffer } from './illustration-alpha-analysis.mjs'

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function uniqBy(items, keyFn) {
  const seen = new Set()
  const ordered = []

  for (const item of items) {
    const key = keyFn(item)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    ordered.push(item)
  }

  return ordered
}

function scorePose(bounds, medians, currentArea) {
  const width = bounds.width
  const height = bounds.height
  const area = width * height
  const ratioWidth = width / medians.width
  const ratioHeight = height / medians.height
  const ratioArea = area / medians.area
  const logDistance =
    Math.abs(Math.log(ratioWidth)) * 1.0 +
    Math.abs(Math.log(ratioHeight)) * 0.7 +
    Math.abs(Math.log(ratioArea)) * 1.1
  const areaDeltaVsCurrent = Math.abs(Math.log(area / currentArea)) * 0.15

  return Number((logDistance + areaDeltaVsCurrent).toFixed(6))
}

function findSkinVisual(visuals, skinId) {
  for (const champion of visuals.items ?? []) {
    const skin = champion.skins?.find((item) => item.id === skinId)

    if (skin) {
      return { champion, skin }
    }
  }

  throw new Error(`missing skin ${skinId}`)
}

export async function loadIllustrationPoseReviewBase(rootDir, options = {}) {
  const visualsPath = path.join(rootDir, options.visualsPath ?? 'public/data/v1/champion-visuals.json')
  const illustrationsPath = path.join(rootDir, options.illustrationsPath ?? 'public/data/v1/champion-illustrations.json')
  const overridesPath = path.join(rootDir, options.overridesPath ?? 'scripts/data/champion-illustration-overrides.json')
  const [visuals, illustrationCollection, overrides] = await Promise.all([
    readFile(visualsPath, 'utf8').then((content) => JSON.parse(content)),
    readFile(illustrationsPath, 'utf8').then((content) => JSON.parse(content)),
    loadChampionIllustrationOverrides(overridesPath),
  ])

  return {
    rootDir,
    visuals,
    illustrations: illustrationCollection.items ?? [],
    overrides,
  }
}

export async function buildIllustrationPoseReview(base, skinId, options = {}) {
  const normalizedSkinId = String(skinId)
  const { champion, skin } = findSkinVisual(base.visuals, normalizedSkinId)
  const asset = skin.xl ?? skin.large ?? skin.base

  if (!asset) {
    throw new Error(`skin ${normalizedSkinId} missing illustration asset`)
  }

  const current = base.illustrations.find((item) => item.skinId === normalizedSkinId)

  if (!current) {
    throw new Error(`skin ${normalizedSkinId} missing current illustration item`)
  }

  const siblings = base.illustrations.filter((item) => item.championId === champion.championId && item.image)
  const medians = {
    width: median(siblings.map((item) => item.image.width)),
    height: median(siblings.map((item) => item.image.height)),
    area: median(siblings.map((item) => item.image.width * item.image.height)),
  }
  const response = await fetch(asset.remoteUrl, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`failed to fetch ${asset.remoteUrl}: ${response.status}`)
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer())
  const skelAnim = decodeSkelAnimGraphicBuffer(asset, rawBuffer)
  const character = skelAnim.characters[0]
  const currentArea = current.image.width * current.image.height
  const candidates = []

  for (const sequence of character.sequences) {
    for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
      const bounds = computeSkelAnimFrameBounds(sequence, frameIndex)

      if (!bounds) {
        continue
      }

      if (bounds.width > 4096 || bounds.height > 4096) {
        continue
      }

      candidates.push({
        sequenceIndex: sequence.sequenceIndex,
        frameIndex,
        width: Number(bounds.width.toFixed(3)),
        height: Number(bounds.height.toFixed(3)),
        area: Number((bounds.width * bounds.height).toFixed(3)),
        visiblePieceCount: bounds.visiblePieceCount,
        score: scorePose(bounds, medians, currentArea),
      })
    }
  }

  const ranked = uniqBy(
    candidates.sort(
      (left, right) =>
        left.score - right.score ||
        left.area - right.area ||
        left.sequenceIndex - right.sequenceIndex ||
        left.frameIndex - right.frameIndex,
    ),
    (item) => `${Math.round(item.width)}x${Math.round(item.height)}`,
  )

  const targetLimit = Math.max(1, Number(options.renderLimit ?? 8))
  const renderTargets = uniqBy(
    [
      {
        label: 'current',
        sequenceIndex: current.render.sequenceIndex,
        frameIndex: current.render.frameIndex,
        current: true,
      },
      ...ranked.slice(0, targetLimit).map((item, index) => ({
        label: `rank${index + 1}`,
        ...item,
      })),
    ],
    (item) => `${item.sequenceIndex}:${item.frameIndex}`,
  )

  const renderedTargets = []

  for (const target of renderTargets) {
    const rendered = await renderSkelAnimPoseToPngBuffer(skelAnim, {
      sequenceIndex: target.sequenceIndex,
      frameIndex: target.frameIndex,
    })

    renderedTargets.push({
      ...target,
      width: rendered.width,
      height: rendered.height,
      visiblePieceCount: rendered.render.visiblePieceCount,
      bounds: rendered.render.bounds,
      alphaMetrics: analyzeIllustrationAlphaPngBuffer(rendered.bytes),
      bytes: rendered.bytes,
    })
  }

  return {
    skinId: normalizedSkinId,
    championId: champion.championId,
    championName: champion.name.display,
    skinName: skin.name.display,
    sourceGraphic: asset.sourceGraphic,
    medians,
    current: {
      sequenceIndex: current.render.sequenceIndex,
      frameIndex: current.render.frameIndex,
      width: current.image.width,
      height: current.image.height,
      alphaMetrics: analyzeIllustrationAlphaPngBuffer(
        await readFile(path.join(base.rootDir, 'public/data', current.image.path)),
      ),
    },
    existingOverride: base.overrides.find((item) => item.skinId === normalizedSkinId) ?? null,
    ranked: ranked.slice(0, Math.max(targetLimit, Number(options.maxCandidates ?? 20))),
    renderedTargets,
  }
}
