import { createCanvas, loadImage } from '@napi-rs/canvas'

function buildAffineTransform(frame) {
  const angle = -frame.rotation
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return {
    a: cos * frame.scaleX,
    b: sin * frame.scaleX,
    c: -sin * frame.scaleY,
    d: cos * frame.scaleY,
    e: frame.x,
    f: frame.y,
  }
}

function applyTransform(transform, x, y) {
  return {
    x: transform.a * x + transform.c * y + transform.e,
    y: transform.b * x + transform.d * y + transform.f,
  }
}

function listVisiblePieces(sequence, frameIndex) {
  return sequence.pieces
    .map((piece) => ({
      piece,
      frame: piece.frames[frameIndex] ?? null,
    }))
    .filter((entry) => entry.frame)
}

function resolveSequenceOrder(character, preferredSequenceIndexes = []) {
  const sequenceByIndex = new Map(character.sequences.map((sequence) => [sequence.sequenceIndex, sequence]))
  const ordered = []
  const seen = new Set()

  for (const index of preferredSequenceIndexes) {
    const sequence = sequenceByIndex.get(index)

    if (!sequence || seen.has(sequence.sequenceIndex)) {
      continue
    }

    ordered.push(sequence)
    seen.add(sequence.sequenceIndex)
  }

  for (const sequence of character.sequences) {
    if (seen.has(sequence.sequenceIndex)) {
      continue
    }

    ordered.push(sequence)
    seen.add(sequence.sequenceIndex)
  }

  return ordered
}

function resolveFrameOrder(sequence, preferredFrameIndexes = []) {
  const ordered = []
  const seen = new Set()

  for (const index of preferredFrameIndexes) {
    if (!Number.isInteger(index) || index < 0 || index >= sequence.length || seen.has(index)) {
      continue
    }

    ordered.push(index)
    seen.add(index)
  }

  for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
    if (seen.has(frameIndex)) {
      continue
    }

    ordered.push(frameIndex)
    seen.add(frameIndex)
  }

  return ordered
}

export function computeSkelAnimFrameBounds(sequence, frameIndex) {
  const visiblePieces = listVisiblePieces(sequence, frameIndex)

  if (visiblePieces.length === 0) {
    return null
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const { piece, frame } of visiblePieces) {
    const transform = buildAffineTransform(frame)
    const corners = [
      applyTransform(transform, -piece.centerX, -piece.centerY),
      applyTransform(transform, piece.sourceWidth - piece.centerX, -piece.centerY),
      applyTransform(transform, piece.sourceWidth - piece.centerX, piece.sourceHeight - piece.centerY),
      applyTransform(transform, -piece.centerX, piece.sourceHeight - piece.centerY),
    ]

    for (const corner of corners) {
      minX = Math.min(minX, corner.x)
      minY = Math.min(minY, corner.y)
      maxX = Math.max(maxX, corner.x)
      maxY = Math.max(maxY, corner.y)
    }
  }

  const width = maxX - minX
  const height = maxY - minY

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    visiblePieceCount: visiblePieces.length,
  }
}

export function selectBestSkelAnimPose(character, options = {}) {
  const maxCanvasEdge = Math.max(4096, Number(options.maxCanvasEdge ?? 4096))
  const sequences = resolveSequenceOrder(character, options.preferredSequenceIndexes ?? [])

  if (sequences.length === 0) {
    throw new Error(`角色 ${character.name} 没有可用 sequence`)
  }

  for (const sequence of sequences) {
    for (const frameIndex of resolveFrameOrder(sequence, options.preferredFrameIndexes ?? [])) {
      const bounds = computeSkelAnimFrameBounds(sequence, frameIndex)

      if (!bounds) {
        continue
      }

      if (bounds.width > maxCanvasEdge || bounds.height > maxCanvasEdge) {
        continue
      }

      return {
        sequenceIndex: sequence.sequenceIndex,
        sequenceLength: sequence.length,
        frameIndex,
        visiblePieceCount: bounds.visiblePieceCount,
        width: bounds.width,
        height: bounds.height,
        area: bounds.width * bounds.height,
        bounds,
      }
    }
  }

  throw new Error(`角色 ${character.name} 没有可渲染的 pose`)
}

async function loadTextureImages(textures) {
  return Promise.all(
    textures.map(async (texture) => ({
      textureId: texture.textureId,
      image: await loadImage(texture.bytes),
    })),
  )
}

export async function renderSkelAnimPoseToPngBuffer(skelAnim, options = {}) {
  const character = skelAnim.characters[options.characterIndex ?? 0]

  if (!character) {
    throw new Error('SkelAnim 中没有可用角色')
  }

  const pose =
    options.sequenceIndex != null && options.frameIndex != null
      ? (() => {
          const sequence = character.sequences.find((item) => item.sequenceIndex === options.sequenceIndex)

          if (!sequence) {
            throw new Error(`角色 ${character.name} 不存在 sequence ${options.sequenceIndex}`)
          }

          const bounds = computeSkelAnimFrameBounds(sequence, options.frameIndex)

          if (!bounds) {
            throw new Error(`角色 ${character.name} 的 sequence ${options.sequenceIndex} frame ${options.frameIndex} 不可渲染`)
          }

          return {
            sequenceIndex: sequence.sequenceIndex,
            sequenceLength: sequence.length,
            frameIndex: options.frameIndex,
            bounds,
          }
        })()
      : selectBestSkelAnimPose(character, options)

  const sequence = character.sequences.find((item) => item.sequenceIndex === pose.sequenceIndex)
  const textureImages = await loadTextureImages(skelAnim.textures)
  const textureImageById = new Map(textureImages.map((item) => [item.textureId, item.image]))
  const width = Math.max(1, Math.ceil(pose.bounds.width))
  const height = Math.max(1, Math.ceil(pose.bounds.height))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  const visiblePieces = listVisiblePieces(sequence, pose.frameIndex).sort((left, right) => left.frame.depth - right.frame.depth)

  for (const { piece, frame } of visiblePieces) {
    const image = textureImageById.get(piece.textureId)

    if (!image) {
      throw new Error(`缺少 texture ${piece.textureId}`)
    }

    context.save()
    context.translate(frame.x - pose.bounds.minX, frame.y - pose.bounds.minY)
    context.rotate(-frame.rotation)
    context.scale(frame.scaleX, frame.scaleY)
    context.drawImage(
      image,
      piece.sourceX,
      piece.sourceY,
      piece.sourceWidth,
      piece.sourceHeight,
      -piece.centerX,
      -piece.centerY,
      piece.sourceWidth,
      piece.sourceHeight,
    )
    context.restore()
  }

  return {
    bytes: canvas.toBuffer('image/png'),
    width,
    height,
    render: {
      sequenceIndex: pose.sequenceIndex,
      sequenceLength: pose.sequenceLength,
      isStaticPose: pose.sequenceLength === 1,
      frameIndex: pose.frameIndex,
      bounds: {
        minX: pose.bounds.minX,
        minY: pose.bounds.minY,
        maxX: pose.bounds.maxX,
        maxY: pose.bounds.maxY,
      },
      visiblePieceCount: pose.bounds.visiblePieceCount,
    },
  }
}
