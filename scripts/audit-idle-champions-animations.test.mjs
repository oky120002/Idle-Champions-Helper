import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { auditChampionAnimations } from './audit-idle-champions-animations.mjs'

function encodeUInt32LE(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value, 0)
  return buffer
}

function encodeInt32LE(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32LE(value, 0)
  return buffer
}

function encodeInt16LE(value) {
  const buffer = Buffer.alloc(2)
  buffer.writeInt16LE(value, 0)
  return buffer
}

function encodeDoubleLE(value) {
  const buffer = Buffer.alloc(8)
  buffer.writeDoubleLE(value, 0)
  return buffer
}

function encodeBoolean(value) {
  return Buffer.from([value ? 1 : 0])
}

function encodeString(value) {
  const bytes = Buffer.from(value, 'utf8')
  return Buffer.concat([encodeInt16LE(bytes.length), bytes])
}

function buildSkelAnimAssetBuffer({ sheetWidth, sheetHeight, textures, characters }) {
  const chunks = [encodeUInt32LE(sheetWidth), encodeUInt32LE(sheetHeight), encodeUInt32LE(textures.length)]

  for (const texture of textures) {
    chunks.push(encodeUInt32LE(texture.length), texture)
  }

  chunks.push(encodeUInt32LE(characters.length))

  for (const character of characters) {
    chunks.push(encodeString(character.name), encodeUInt32LE(character.sequences.length))

    for (const sequence of character.sequences) {
      chunks.push(encodeUInt32LE(sequence.length), encodeUInt32LE(sequence.pieces.length))

      for (const piece of sequence.pieces) {
        chunks.push(
          encodeUInt32LE(piece.textureId),
          encodeUInt32LE(piece.sourceX),
          encodeUInt32LE(piece.sourceY),
          encodeUInt32LE(piece.sourceWidth),
          encodeUInt32LE(piece.sourceHeight),
          encodeInt32LE(piece.centerX),
          encodeInt32LE(piece.centerY),
        )

        for (const frame of piece.frames) {
          chunks.push(encodeBoolean(Boolean(frame)))

          if (!frame) {
            continue
          }

          chunks.push(
            encodeUInt32LE(frame.depth),
            encodeDoubleLE(frame.rotation),
            encodeDoubleLE(frame.scaleX),
            encodeDoubleLE(frame.scaleY),
            encodeDoubleLE(frame.x),
            encodeDoubleLE(frame.y),
          )
        }
      }
    }
  }

  return zlib.deflateSync(Buffer.concat(chunks))
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-animation-audit-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

function buildFrame({ x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1, depth = 0 } = {}) {
  return { depth, rotation, scaleX, scaleY, x, y }
}

function createAuditFixtureBuffer() {
  return buildSkelAnimAssetBuffer({
    sheetWidth: 16,
    sheetHeight: 16,
    textures: [Buffer.from([1, 2, 3, 4])],
    characters: [
      {
        name: 'AuditHero',
        sequences: [
          {
            length: 4,
            pieces: [
              {
                textureId: 0,
                sourceX: 0,
                sourceY: 0,
                sourceWidth: 6,
                sourceHeight: 8,
                centerX: 0,
                centerY: 0,
                frames: [buildFrame({ x: 0, y: 0 }), buildFrame({ x: 0, y: 0 }), buildFrame({ x: 0, y: 0 }), buildFrame({ x: 0, y: 0 })],
              },
              {
                textureId: 0,
                sourceX: 0,
                sourceY: 0,
                sourceWidth: 3,
                sourceHeight: 3,
                centerX: 0,
                centerY: 0,
                frames: [buildFrame({ x: 3, y: 1 }), null, null, null],
              },
            ],
          },
          {
            length: 4,
            pieces: [
              {
                textureId: 0,
                sourceX: 0,
                sourceY: 0,
                sourceWidth: 6,
                sourceHeight: 8,
                centerX: 0,
                centerY: 0,
                frames: [buildFrame({ x: 0, y: 0 }), buildFrame({ x: 0.2, y: 0 }), buildFrame({ x: -0.2, y: 0 }), buildFrame({ x: 0, y: 0 })],
              },
              {
                textureId: 0,
                sourceX: 0,
                sourceY: 0,
                sourceWidth: 2,
                sourceHeight: 4,
                centerX: 0,
                centerY: 0,
                frames: [buildFrame({ x: 5, y: 1 }), buildFrame({ x: 5.2, y: 1.1 }), buildFrame({ x: 4.8, y: 1 }), buildFrame({ x: 5, y: 0.9 })],
              },
              {
                textureId: 0,
                sourceX: 0,
                sourceY: 0,
                sourceWidth: 2,
                sourceHeight: 4,
                centerX: 0,
                centerY: 0,
                frames: [buildFrame({ x: -1, y: 3 }), buildFrame({ x: -1.1, y: 3.1 }), buildFrame({ x: -0.9, y: 3 }), buildFrame({ x: -1, y: 2.9 })],
              },
            ],
          },
        ],
      },
    ],
  })
}

test('auditChampionAnimations 为可疑默认 sequence 产出推荐候选', async (t) => {
  const tempDir = await createTempDir(t)
  const outputDir = path.join(tempDir, 'public', 'data', 'v1')
  const heroDir = path.join(outputDir, 'champion-animations', 'heroes')
  const rawBuffer = createAuditFixtureBuffer()

  await mkdir(heroDir, { recursive: true })
  await writeFile(path.join(heroDir, '23.bin'), rawBuffer)
  await writeJson(path.join(outputDir, 'champion-animations.json'), {
    updatedAt: '2026-04-25',
    items: [
      {
        id: 'hero:23',
        championId: '23',
        skinId: null,
        kind: 'hero-base',
        seat: 11,
        championName: { original: 'Strix', display: '斯崔克丝' },
        illustrationName: { original: 'Strix', display: '斯崔克丝' },
        sourceSlot: 'base',
        sourceGraphicId: '20524',
        sourceGraphic: 'Characters/Event/Hero_Strix',
        sourceVersion: 3,
        fps: 24,
        defaultSequenceIndex: 0,
        defaultFrameIndex: 0,
        asset: {
          path: 'v1/champion-animations/heroes/23.bin',
          bytes: rawBuffer.length,
          format: 'skelanim-zlib',
        },
        sequences: [
          {
            sequenceIndex: 0,
            frameCount: 4,
            pieceCount: 2,
            firstRenderableFrameIndex: 0,
            bounds: { minX: 0, minY: 0, maxX: 6, maxY: 8 },
          },
          {
            sequenceIndex: 1,
            frameCount: 4,
            pieceCount: 3,
            firstRenderableFrameIndex: 0,
            bounds: { minX: -1, minY: 0, maxX: 8, maxY: 9 },
          },
        ],
      },
    ],
  })

  const result = await auditChampionAnimations({ outputDir, currentVersion: 'v1' })
  const auditCollection = JSON.parse(await readFile(path.join(outputDir, 'champion-animation-audit.json'), 'utf8'))
  const entry = auditCollection.items[0]

  assert.equal(result.count, 1)
  assert.equal(result.reviewedCount, 1)
  assert.equal(entry.id, 'hero:23')
  assert.equal(entry.current.sequenceIndex, 0)
  assert.equal(entry.recommended.sequenceIndex, 1)
  assert.equal(entry.suspicionLevel, 'high')
  assert.ok(entry.suspicionSignals.includes('visibility_gap'))
  assert.ok(entry.suspicionSignals.includes('persistent_gap'))
  assert.equal(entry.candidates[0].sequenceIndex, 1)
})

test('auditChampionAnimations 在局部更新时保留未命中的既有条目', async (t) => {
  const tempDir = await createTempDir(t)
  const outputDir = path.join(tempDir, 'public', 'data', 'v1')
  const heroDir = path.join(outputDir, 'champion-animations', 'heroes')
  const rawBuffer = createAuditFixtureBuffer()

  await mkdir(heroDir, { recursive: true })
  await writeFile(path.join(heroDir, '23.bin'), rawBuffer)
  await writeJson(path.join(outputDir, 'champion-animations.json'), {
    updatedAt: '2026-04-25',
    items: [
      {
        id: 'hero:23',
        championId: '23',
        skinId: null,
        kind: 'hero-base',
        seat: 11,
        championName: { original: 'Strix', display: '斯崔克丝' },
        illustrationName: { original: 'Strix', display: '斯崔克丝' },
        sourceSlot: 'base',
        sourceGraphicId: '20524',
        sourceGraphic: 'Characters/Event/Hero_Strix',
        sourceVersion: 3,
        fps: 24,
        defaultSequenceIndex: 0,
        defaultFrameIndex: 0,
        asset: {
          path: 'v1/champion-animations/heroes/23.bin',
          bytes: rawBuffer.length,
          format: 'skelanim-zlib',
        },
        sequences: [
          {
            sequenceIndex: 0,
            frameCount: 4,
            pieceCount: 2,
            firstRenderableFrameIndex: 0,
            bounds: { minX: 0, minY: 0, maxX: 6, maxY: 8 },
          },
          {
            sequenceIndex: 1,
            frameCount: 4,
            pieceCount: 3,
            firstRenderableFrameIndex: 0,
            bounds: { minX: -1, minY: 0, maxX: 8, maxY: 9 },
          },
        ],
      },
    ],
  })
  await writeJson(path.join(outputDir, 'champion-animation-audit.json'), {
    updatedAt: '2026-04-24',
    items: [
      {
        id: 'hero:99',
        championId: '99',
        skinId: null,
        kind: 'hero-base',
        seat: 3,
        championName: { original: 'Other', display: '其他' },
        illustrationName: { original: 'Other', display: '其他' },
        currentSequenceIndex: 0,
        currentFrameIndex: 0,
        sequenceCount: 1,
        suspicionLevel: 'none',
        suspicionScore: 0,
        suspicionSignals: [],
        current: {
          sequenceIndex: 0,
          frameIndex: 0,
          frameCount: 1,
          pieceCount: 1,
          renderableFrameCount: 1,
          renderableFrameRatio: 1,
          persistentPieceCount: 1,
          persistentPieceRatio: 1,
          singleFramePieceCount: 0,
          singleFramePieceRatio: 0,
          averageVisiblePieceRatio: 1,
          nullPieceRatio: 0,
          bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
          boundsArea: 1,
          averageMotion: 0,
          pieceCoverageRatio: 1,
          boundsAreaRatio: 1,
          motionRatio: 0,
          motionScore: 0.35,
          score: 9,
        },
        recommended: {
          sequenceIndex: 0,
          frameIndex: 0,
          frameCount: 1,
          pieceCount: 1,
          renderableFrameCount: 1,
          renderableFrameRatio: 1,
          persistentPieceCount: 1,
          persistentPieceRatio: 1,
          singleFramePieceCount: 0,
          singleFramePieceRatio: 0,
          averageVisiblePieceRatio: 1,
          nullPieceRatio: 0,
          bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
          boundsArea: 1,
          averageMotion: 0,
          pieceCoverageRatio: 1,
          boundsAreaRatio: 1,
          motionRatio: 0,
          motionScore: 0.35,
          score: 9,
        },
        candidates: [],
      },
    ],
  })

  await auditChampionAnimations({ outputDir, currentVersion: 'v1', championIds: '23' })
  const auditCollection = JSON.parse(await readFile(path.join(outputDir, 'champion-animation-audit.json'), 'utf8'))
  const ids = auditCollection.items.map((item) => item.id)

  assert.deepEqual(ids.sort(), ['hero:23', 'hero:99'])
})
