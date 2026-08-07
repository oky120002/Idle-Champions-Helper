import { Buffer } from 'node:buffer'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { it, expect, describe } from 'vitest'
import { writeJson } from './data/io-utils.ts'
import { syncChampionAnimations, summarizeAnimationSizes } from './sync-idle-champions-animations.ts'

interface TestHooks {
  onTestFinished(fn: () => Promise<void> | void): void
}

function encodeUInt32LE(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value, 0)
  return buffer
}

function encodeInt32LE(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32LE(value, 0)
  return buffer
}

function encodeInt16LE(value: number): Buffer {
  const buffer = Buffer.alloc(2)
  buffer.writeInt16LE(value, 0)
  return buffer
}

function encodeDoubleLE(value: number): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeDoubleLE(value, 0)
  return buffer
}

function encodeBoolean(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0])
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8')
  return Buffer.concat([encodeInt16LE(bytes.length), bytes])
}

interface RawAnimationFrame {
  depth: number
  rotation: number
  scaleX: number
  scaleY: number
  x: number
  y: number
}

interface RawAnimPiece {
  textureId: number
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  centerX: number
  centerY: number
  frames: Array<RawAnimationFrame | null>
}

interface RawAnimSequence {
  length: number
  pieces: RawAnimPiece[]
}

interface RawAnimCharacter {
  name: string
  sequences: RawAnimSequence[]
}

interface BuildSkelAnimAssetBufferOptions {
  sheetWidth: number
  sheetHeight: number
  textures: Buffer[]
  characters: RawAnimCharacter[]
}

function buildSkelAnimAssetBuffer({
  sheetWidth,
  sheetHeight,
  textures,
  characters,
}: BuildSkelAnimAssetBufferOptions): Buffer {
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

function toDataUrl(buffer: Buffer): string {
  return `data:application/octet-stream;base64,${buffer.toString('base64')}`
}

async function createTempDir(hooks: TestHooks): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-animations-'))
  hooks.onTestFinished(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

function createRawBuffer(): Buffer {
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

interface AnimationCollectionItem {
  id: string
  kind: string
  skinId: string | null
  sourceSlot: string
  asset: { path: string }
  defaultSequenceIndex: number
  defaultFrameIndex: number
}

it('syncChampionAnimations 输出 hero-base 与 skin 原始动画包和清单', async (ctx) => {
  const tempDir = await createTempDir(ctx)
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
    outputDir: tempDir,
    currentVersion: 'v1',
    visualsFile,
  })

  const collection = (await JSON.parse(
    await readFile(path.join(tempDir, 'champion-animations.json'), 'utf8'),
  )) as { items: AnimationCollectionItem[] }
  const heroAnimation = collection.items.find((item) => item.id === 'hero:23')
  const skinAnimation = collection.items.find((item) => item.id === 'skin:340')
  const writtenHeroBuffer = await readFile(path.join(tempDir, 'champion-animations', 'heroes', '23.bin'))
  const writtenSkinBuffer = await readFile(path.join(tempDir, 'champion-animations', 'skins', '340.bin'))

  expect(result.heroCount).toBe(1)
  expect(result.skinCount).toBe(1)
  expect(heroAnimation).toBeTruthy()
  expect(skinAnimation).toBeTruthy()
  expect(heroAnimation?.kind).toBe('hero-base')
  expect(heroAnimation?.skinId).toBe(null)
  expect(heroAnimation?.sourceSlot).toBe('base')
  expect(heroAnimation?.asset.path).toBe('v1/champion-animations/heroes/23.bin')
  expect(heroAnimation?.defaultSequenceIndex).toBe(0)
  expect(heroAnimation?.defaultFrameIndex).toBe(0)
  expect(skinAnimation?.kind).toBe('skin')
  expect(skinAnimation?.skinId).toBe('340')
  expect(skinAnimation?.sourceSlot).toBe('xl')
  expect(skinAnimation?.asset.path).toBe('v1/champion-animations/skins/340.bin')
  expect(skinAnimation?.defaultSequenceIndex).toBe(0)
  expect(skinAnimation?.defaultFrameIndex).toBe(0)
  expect(writtenHeroBuffer.equals(heroRawBuffer)).toBe(true)
  expect(writtenSkinBuffer.equals(skinRawBuffer)).toBe(true)
})

it('命中同版本已发布 bin 时直接复用本地 hero-base 与 skin 资源', async (ctx) => {
  const tempDir = await createTempDir(ctx)
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
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionAnimations({
    input: definitionsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
    visualsFile,
  })

  expect(fetchCalled).toBe(false)
  expect(result.downloadedCount).toBe(0)
  expect(result.reusedCount).toBe(2)
  expect(result.heroCount).toBe(1)
  expect(result.skinCount).toBe(1)
})

it('在集合 updatedAt 未变新时整批跳过，不重下也不重写 bin', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const collectionFile = path.join(tempDir, 'champion-animations.json')

  await writeJson(visualsFile, {
    updatedAt: '2026-04-17',
    items: [],
  })
  await writeJson(collectionFile, {
    updatedAt: '2026-04-17',
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
          bytes: 123,
          format: 'skelanim-zlib',
        },
        sequences: [],
      },
    ],
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('updatedAt 未变新时不应触发下载')
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = await syncChampionAnimations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  expect(result.skipped).toBe(true)
  expect(result.downloadedCount).toBe(0)
  expect(result.reusedCount).toBe(1)
  expect(result.count).toBe(1)
})

describe('summarizeAnimationSizes', () => {
  it('空数组返回零值且无告警', () => {
    const result = summarizeAnimationSizes([], 512 * 1024)
    expect(result.maxBytes).toBe(0)
    expect(result.medianBytes).toBe(0)
    expect(result.averageBytes).toBe(0)
    expect(result.oversized).toHaveLength(0)
  })

  it('正确统计最大/中位/平均值', () => {
    const items = [
      { id: 'a', kind: 'hero-base' as const, bytes: 100 },
      { id: 'b', kind: 'hero-base' as const, bytes: 200 },
      { id: 'c', kind: 'hero-base' as const, bytes: 300 },
      { id: 'd', kind: 'skin' as const, bytes: 400 },
    ]
    const result = summarizeAnimationSizes(items, 512 * 1024)
    expect(result.maxBytes).toBe(400)
    expect(result.medianBytes).toBe(300)
    expect(result.averageBytes).toBe(250)
  })

  it('超阈值条目进入 oversized 列表', () => {
    const items = [
      { id: 'a', kind: 'hero-base' as const, bytes: 100 },
      { id: 'b', kind: 'skin' as const, bytes: 600 * 1024 },
    ]
    const result = summarizeAnimationSizes(items, 512 * 1024)
    expect(result.oversized).toHaveLength(1)
    expect(result.oversized[0]?.id).toBe('b')
  })
})
