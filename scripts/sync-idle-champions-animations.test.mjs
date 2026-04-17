import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { syncChampionAnimations } from './sync-idle-champions-animations.mjs'

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

function toDataUrl(buffer) {
  return `data:application/octet-stream;base64,${buffer.toString('base64')}`
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-animations-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

function createRawBuffer() {
  return buildSkelAnimAssetBuffer({
    sheetWidth: 2,
    sheetHeight: 2,
    textures: [Buffer.from([1, 2, 3, 4])],
    characters: [
      {
        name: 'AnimHero',
        sequences: [
          {
            length: 2,
            pieces: [
              {
                textureId: 0,
                sourceX: 0,
                sourceY: 0,
                sourceWidth: 1,
                sourceHeight: 1,
                centerX: 0,
                centerY: 0,
                frames: [
                  {
                    depth: 0,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    x: 0,
                    y: 0,
                  },
                  {
                    depth: 0,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    x: 1,
                    y: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
}

test('syncChampionAnimations 输出 hero-base 与 skin 原始动画包和清单', async (t) => {
  const tempDir = await createTempDir(t)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const definitionsFile = path.join(tempDir, 'definitions.json')
  const heroRawBuffer = createRawBuffer()
  const skinRawBuffer = createRawBuffer()

  await writeJson(visualsFile, {
    updatedAt: '2026-04-17',
    items: [
      {
        championId: '23',
        seat: 11,
        name: { original: 'Strix', display: '斯崔克丝' },
        portrait: null,
        base: {
          graphicId: '20524',
          sourceGraphic: 'Characters/Event/Hero_Strix',
          sourceVersion: 3,
          remotePath: 'mobile_assets/Characters/Event/Hero_Strix',
          remoteUrl: toDataUrl(heroRawBuffer),
          delivery: 'zlib-png',
          uses: ['crusader'],
        },
        skins: [
          {
            id: '340',
            name: { original: 'Venture Casual Strix', display: '冒险休闲斯崔克丝' },
            portrait: null,
            base: null,
            large: null,
            xl: {
              graphicId: '20525',
              sourceGraphic: 'Characters/Event/Hero_Strix_VentureCasual_4xup',
              sourceVersion: 3,
              remotePath: 'mobile_assets/Characters/Event/Hero_Strix_VentureCasual_4xup',
              remoteUrl: toDataUrl(skinRawBuffer),
              delivery: 'zlib-png',
              uses: ['crusader'],
            },
          },
        ],
      },
    ],
  })

  await writeJson(definitionsFile, {
    graphic_defines: [
      {
        id: 20524,
        type: 3,
        export_params: {
          sequence_override: [1],
        },
      },
      {
        id: 20525,
        type: 3,
        export_params: {
          sequence_override: [1],
        },
      },
    ],
  })

  const result = await syncChampionAnimations({
    input: definitionsFile,
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  const collection = JSON.parse(await readFile(path.join(tempDir, 'champion-animations.json'), 'utf8'))
  const heroAnimation = collection.items.find((item) => item.id === 'hero:23')
  const skinAnimation = collection.items.find((item) => item.id === 'skin:340')
  const writtenHeroBuffer = await readFile(path.join(tempDir, 'champion-animations', 'heroes', '23.bin'))
  const writtenSkinBuffer = await readFile(path.join(tempDir, 'champion-animations', 'skins', '340.bin'))

  assert.equal(result.heroCount, 1)
  assert.equal(result.skinCount, 1)
  assert.ok(heroAnimation)
  assert.ok(skinAnimation)
  assert.equal(heroAnimation.kind, 'hero-base')
  assert.equal(heroAnimation.skinId, null)
  assert.equal(heroAnimation.sourceSlot, 'base')
  assert.equal(heroAnimation.asset.path, 'v1/champion-animations/heroes/23.bin')
  assert.equal(heroAnimation.defaultSequenceIndex, 0)
  assert.equal(heroAnimation.defaultFrameIndex, 0)
  assert.equal(skinAnimation.kind, 'skin')
  assert.equal(skinAnimation.skinId, '340')
  assert.equal(skinAnimation.sourceSlot, 'xl')
  assert.equal(skinAnimation.asset.path, 'v1/champion-animations/skins/340.bin')
  assert.equal(skinAnimation.defaultSequenceIndex, 0)
  assert.equal(skinAnimation.defaultFrameIndex, 0)
  assert.deepEqual(writtenHeroBuffer, heroRawBuffer)
  assert.deepEqual(writtenSkinBuffer, skinRawBuffer)
})

test('syncChampionAnimations 命中同版本已发布 bin 时直接复用本地 hero-base 与 skin 资源', async (t) => {
  const tempDir = await createTempDir(t)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const definitionsFile = path.join(tempDir, 'definitions.json')
  const collectionFile = path.join(tempDir, 'champion-animations.json')
  const heroDir = path.join(tempDir, 'champion-animations', 'heroes')
  const skinDir = path.join(tempDir, 'champion-animations', 'skins')
  const heroRawBuffer = createRawBuffer()
  const skinRawBuffer = createRawBuffer()

  await writeJson(visualsFile, {
    updatedAt: '2026-04-17',
    items: [
      {
        championId: '23',
        seat: 11,
        name: { original: 'Strix', display: '斯崔克丝' },
        portrait: null,
        base: {
          graphicId: '20524',
          sourceGraphic: 'Characters/Event/Hero_Strix',
          sourceVersion: 3,
          remotePath: 'mobile_assets/Characters/Event/Hero_Strix',
          remoteUrl: 'https://example.invalid/hero-should-not-fetch',
          delivery: 'zlib-png',
          uses: ['crusader'],
        },
        skins: [
          {
            id: '340',
            name: { original: 'Venture Casual Strix', display: '冒险休闲斯崔克丝' },
            portrait: null,
            base: null,
            large: null,
            xl: {
              graphicId: '20525',
              sourceGraphic: 'Characters/Event/Hero_Strix_VentureCasual_4xup',
              sourceVersion: 3,
              remotePath: 'mobile_assets/Characters/Event/Hero_Strix_VentureCasual_4xup',
              remoteUrl: 'https://example.invalid/skin-should-not-fetch',
              delivery: 'zlib-png',
              uses: ['crusader'],
            },
          },
        ],
      },
    ],
  })

  await writeJson(definitionsFile, {
    graphic_defines: [
      {
        id: 20524,
        type: 3,
        export_params: {
          sequence_override: [1],
        },
      },
      {
        id: 20525,
        type: 3,
        export_params: {
          sequence_override: [1],
        },
      },
    ],
  })

  await mkdir(heroDir, { recursive: true })
  await mkdir(skinDir, { recursive: true })
  await writeFile(path.join(heroDir, '23.bin'), heroRawBuffer)
  await writeFile(path.join(skinDir, '340.bin'), skinRawBuffer)
  await writeJson(collectionFile, {
    updatedAt: '2026-04-16',
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
          bytes: heroRawBuffer.length,
          format: 'skelanim-zlib',
        },
        sequences: [
          {
            sequenceIndex: 0,
            frameCount: 2,
            pieceCount: 1,
            firstRenderableFrameIndex: 0,
            bounds: {
              minX: 0,
              minY: 0,
              maxX: 2,
              maxY: 1,
            },
          },
        ],
      },
      {
        id: 'skin:340',
        championId: '23',
        skinId: '340',
        kind: 'skin',
        seat: 11,
        championName: { original: 'Strix', display: '斯崔克丝' },
        illustrationName: { original: 'Venture Casual Strix', display: '冒险休闲斯崔克丝' },
        sourceSlot: 'xl',
        sourceGraphicId: '20525',
        sourceGraphic: 'Characters/Event/Hero_Strix_VentureCasual_4xup',
        sourceVersion: 3,
        fps: 24,
        defaultSequenceIndex: 0,
        defaultFrameIndex: 0,
        asset: {
          path: 'v1/champion-animations/skins/340.bin',
          bytes: skinRawBuffer.length,
          format: 'skelanim-zlib',
        },
        sequences: [
          {
            sequenceIndex: 0,
            frameCount: 2,
            pieceCount: 1,
            firstRenderableFrameIndex: 0,
            bounds: {
              minX: 0,
              minY: 0,
              maxX: 2,
              maxY: 1,
            },
          },
        ],
      },
    ],
  })

  const originalFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = async () => {
    fetchCalled = true
    throw new Error('should not fetch when local bin can be reused')
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionAnimations({
    input: definitionsFile,
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  assert.equal(fetchCalled, false)
  assert.equal(result.downloadedCount, 0)
  assert.equal(result.reusedCount, 2)
  assert.equal(result.heroCount, 1)
  assert.equal(result.skinCount, 1)
})
