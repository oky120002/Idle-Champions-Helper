import { it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { syncChampionIllustrations } from './sync-idle-champions-illustrations.ts'

interface TestHooks {
  onTestFinished(fn: () => Promise<void> | void): void
}

type PixelColor = [number, number, number, number]

function createSolidTexture(
  width: number,
  height: number,
  colorByPixel: (x: number, y: number) => PixelColor,
): Buffer {
  const png = new PNG({ width, height })

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2
      const [r, g, b, a] = colorByPixel(x, y)
      png.data[index] = r
      png.data[index + 1] = g
      png.data[index + 2] = b
      png.data[index + 3] = a
    }
  }

  return PNG.sync.write(png)
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

function toDataUrl(buffer: Buffer, mimeType = 'application/octet-stream'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

interface DecodedPngAssetOptions {
  graphicId: string
  sourceGraphic: string
  color: [number, number, number]
  remotePath: string
}

function createDecodedPngAsset({ graphicId, sourceGraphic, color, remotePath }: DecodedPngAssetOptions) {
  const png = createSolidTexture(1, 1, () => [...color, 255] as PixelColor)

  return {
    graphicId,
    sourceGraphic,
    sourceVersion: 1,
    remotePath,
    remoteUrl: toDataUrl(zlib.deflateSync(png)),
    delivery: 'zlib-png',
    uses: [],
  }
}

function createSkelAnimRawBuffer(): Buffer {
  const texture = createSolidTexture(2, 2, (x, y) => {
    if (x === 0 && y === 0) {
      return [255, 0, 0, 255]
    }

    if (x === 1 && y === 0) {
      return [0, 255, 0, 255]
    }

    if (x === 0 && y === 1) {
      return [0, 0, 255, 255]
    }

    return [255, 255, 0, 255]
  })

  return buildSkelAnimAssetBuffer({
    sheetWidth: 2,
    sheetHeight: 2,
    textures: [texture],
    characters: [
      {
        name: 'OverrideHero',
        sequences: [
          {
            length: 1,
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
                ],
              },
            ],
          },
          {
            length: 2,
            pieces: [
              {
                textureId: 0,
                sourceX: 1,
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
                  null,
                ],
              },
              {
                textureId: 0,
                sourceX: 1,
                sourceY: 1,
                sourceWidth: 1,
                sourceHeight: 1,
                centerX: 0,
                centerY: 0,
                frames: [
                  null,
                  {
                    depth: 0,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    x: 0,
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

function createWalkPosterRawBuffer(): Buffer {
  const texture = createSolidTexture(2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 255, 0, 255]))

  return buildSkelAnimAssetBuffer({
    sheetWidth: 2,
    sheetHeight: 1,
    textures: [texture],
    characters: [
      {
        name: 'WalkPosterHero',
        sequences: [
          {
            length: 4,
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
                  { depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                  { depth: 0, rotation: 0.01, scaleX: 1, scaleY: 1, x: 0.05, y: 0 },
                  { depth: 0, rotation: -0.01, scaleX: 1, scaleY: 1, x: -0.05, y: 0 },
                  { depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                ],
              },
            ],
          },
          {
            length: 4,
            pieces: [
              {
                textureId: 0,
                sourceX: 1,
                sourceY: 0,
                sourceWidth: 1,
                sourceHeight: 1,
                centerX: 0,
                centerY: 0,
                frames: [
                  { depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                  { depth: 0, rotation: 0.11, scaleX: 1, scaleY: 1, x: 2, y: 0 },
                  { depth: 0, rotation: -0.08, scaleX: 1, scaleY: 1, x: 1, y: 0 },
                  { depth: 0, rotation: -0.03, scaleX: 1, scaleY: 1, x: 2, y: 0 },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
}

interface AnimationSequence {
  sequenceIndex: number
  frameCount: number
  pieceCount: number
  firstRenderableFrameIndex: number
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

interface AnimationManifestItem {
  id: string
  championId: string
  skinId: string | null
  kind: string
  seat: number
  championName: { original: string; display: string }
  illustrationName: { original: string; display: string }
  sourceSlot: string
  sourceGraphicId: string
  sourceGraphic: string
  sourceVersion: number
  fps: number
  defaultSequenceIndex: number
  defaultFrameIndex: number
  asset: { path: string; bytes: number; format: string }
  sequences: AnimationSequence[]
}

interface CreateSkinAnimationManifestItemOptions {
  championId: string
  skinId: string
  seat: number
  championName: { original: string; display: string }
  illustrationName: { original: string; display: string }
  sourceSlot?: string
  sourceGraphicId?: string
  sourceGraphic?: string
  sourceVersion?: number
  defaultSequenceIndex?: number
  defaultFrameIndex?: number
  assetBytes: number
}

function createSkinAnimationManifestItem({
  championId,
  skinId,
  seat,
  championName,
  illustrationName,
  sourceSlot = 'xl',
  sourceGraphicId = `anim-${skinId}`,
  sourceGraphic = `Skin_${skinId}_Anim`,
  sourceVersion = 1,
  defaultSequenceIndex = 1,
  defaultFrameIndex = 1,
  assetBytes,
}: CreateSkinAnimationManifestItemOptions): AnimationManifestItem {
  return {
    id: `skin:${skinId}`,
    championId,
    skinId,
    kind: 'skin',
    seat,
    championName,
    illustrationName,
    sourceSlot,
    sourceGraphicId,
    sourceGraphic,
    sourceVersion,
    fps: 24,
    defaultSequenceIndex,
    defaultFrameIndex,
    asset: {
      path: `v1/champion-animations/skins/${skinId}.bin`,
      bytes: assetBytes,
      format: 'skelanim-zlib',
    },
    sequences: [
      {
        sequenceIndex: 0,
        frameCount: 1,
        pieceCount: 1,
        firstRenderableFrameIndex: 0,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      },
      {
        sequenceIndex: 1,
        frameCount: 2,
        pieceCount: 2,
        firstRenderableFrameIndex: 0,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      },
    ],
  }
}

interface CreateHeroAnimationManifestItemOptions {
  championId: string
  seat: number
  championName: { original: string; display: string }
  sourceGraphicId?: string
  sourceGraphic?: string
  sourceVersion?: number
  defaultSequenceIndex?: number
  defaultFrameIndex?: number
  assetBytes: number
}

function createHeroAnimationManifestItem({
  championId,
  seat,
  championName,
  sourceGraphicId = `hero-${championId}-anim`,
  sourceGraphic = `Hero_${championId}_Anim`,
  sourceVersion = 1,
  defaultSequenceIndex = 1,
  defaultFrameIndex = 1,
  assetBytes,
}: CreateHeroAnimationManifestItemOptions): AnimationManifestItem {
  return {
    id: `hero:${championId}`,
    championId,
    skinId: null,
    kind: 'hero-base',
    seat,
    championName,
    illustrationName: championName,
    sourceSlot: 'base',
    sourceGraphicId,
    sourceGraphic,
    sourceVersion,
    fps: 24,
    defaultSequenceIndex,
    defaultFrameIndex,
    asset: {
      path: `v1/champion-animations/heroes/${championId}.bin`,
      bytes: assetBytes,
      format: 'skelanim-zlib',
    },
    sequences: [
      {
        sequenceIndex: 0,
        frameCount: 1,
        pieceCount: 1,
        firstRenderableFrameIndex: 0,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      },
      {
        sequenceIndex: 1,
        frameCount: 2,
        pieceCount: 2,
        firstRenderableFrameIndex: 0,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      },
    ],
  }
}

async function writeAnimationCollection(
  tempDir: string,
  items: AnimationManifestItem[],
  rawBuffer: Buffer = createSkelAnimRawBuffer(),
): Promise<Buffer> {
  await mkdir(path.join(tempDir, 'champion-animations', 'heroes'), { recursive: true })
  await mkdir(path.join(tempDir, 'champion-animations', 'skins'), { recursive: true })

  for (const item of items) {
    const group = item.kind === 'hero-base' ? 'heroes' : 'skins'
    const fileId = item.kind === 'hero-base' ? item.championId : (item.skinId ?? '')
    await writeFile(path.join(tempDir, 'champion-animations', group, `${fileId}.bin`), rawBuffer)
  }

  await writeJson(path.join(tempDir, 'champion-animations.json'), {
    updatedAt: '2026-04-16',
    items: items.map((item) => ({
      ...item,
      asset: {
        ...item.asset,
        bytes: rawBuffer.length,
      },
    })),
  })

  return rawBuffer
}

async function createTempDir(hooks: TestHooks): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-illustrations-'))
  hooks.onTestFinished(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

interface IllustrationCollectionItem {
  id: string
  sourceGraphicId: string
  sourceSlot: string
  render: {
    sequenceIndex: number | null
    frameIndex: number | null
    bounds?: { minX: number; minY: number; maxX: number; maxY: number } | null
  }
  image: { width: number; height: number }
}

interface IllustrationCollection {
  items: IllustrationCollectionItem[]
}

it('皮肤与 hero-base 静态图会复用动画链路生成 poster', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const championName = { original: 'Animation Hero', display: '动画像英雄' }
  const skinName = { original: 'Preferred Animation Frame', display: '动画默认帧' }
  const heroItem = createHeroAnimationManifestItem({
    championId: '101',
    seat: 1,
    championName,
    sourceGraphicId: 'hero-101-anim',
    sourceGraphic: 'Hero_101_Anim',
    defaultSequenceIndex: 1,
    defaultFrameIndex: 1,
    assetBytes: 0,
  })
  const skinItem = createSkinAnimationManifestItem({
    championId: '101',
    skinId: '501',
    seat: 1,
    championName,
    illustrationName: skinName,
    sourceSlot: 'xl',
    sourceGraphicId: 'g-xl',
    sourceGraphic: 'Skin_XL',
    defaultSequenceIndex: 1,
    defaultFrameIndex: 1,
    assetBytes: 0,
  })

  await writeJson(visualsFile, {
    updatedAt: '2026-04-16',
    items: [
      {
        championId: '101',
        seat: 1,
        name: championName,
        portrait: null,
        base: createDecodedPngAsset({
          graphicId: 'hero-static',
          sourceGraphic: 'Hero_Static',
          color: [12, 34, 56],
          remotePath: '/Portraits/Hero_Static',
        }),
        skins: [
          {
            id: '501',
            name: skinName,
            portrait: null,
            base: null,
            large: null,
            xl: null,
          },
        ],
      },
    ],
  })
  await writeAnimationCollection(tempDir, [heroItem, skinItem])

  await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  const output = (await JSON.parse(
    await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'),
  )) as IllustrationCollection
  const heroIllustration = output.items.find((item) => item.id === 'hero:101')
  const skinIllustration = output.items.find((item) => item.id === 'skin:501')
  const heroPng = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'heroes', '101.png')))
  const skinPng = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'skins', '501.png')))

  expect(heroIllustration).toBeTruthy()
  expect(skinIllustration).toBeTruthy()
  expect(heroIllustration?.sourceGraphicId).toBe('hero-101-anim')
  expect(heroIllustration?.render.sequenceIndex).toBe(1)
  expect(heroIllustration?.render.frameIndex).toBe(1)
  expect(heroIllustration?.sourceSlot).toBe('base')
  expect(skinIllustration?.sourceGraphicId).toBe('g-xl')
  expect(skinIllustration?.render.sequenceIndex).toBe(1)
  expect(skinIllustration?.render.frameIndex).toBe(1)
  expect(skinIllustration?.sourceSlot).toBe('xl')
  expect(heroIllustration?.image.width).toBe(2)
  expect(heroIllustration?.image.height).toBe(2)
  expect(skinIllustration?.image.width).toBe(2)
  expect(skinIllustration?.image.height).toBe(2)
  expect(heroPng.data[3]).toBe(255)
  expect(skinPng.data[3]).toBe(255)
  expect(Number(heroPng.data[0]) > 0 || Number(heroPng.data[1]) > 0 || Number(heroPng.data[2]) > 0).toBeTruthy()
  expect(Number(skinPng.data[0]) > 0 || Number(skinPng.data[1]) > 0 || Number(skinPng.data[2]) > 0).toBeTruthy()
})

it('会把 walk-like 动效首帧渲染成与 hover 一致的 poster', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const championName = { original: 'Walk Poster Hero', display: '步行动效海报' }
  const rawBuffer = createWalkPosterRawBuffer()
  const heroItem = createHeroAnimationManifestItem({
    championId: '301',
    seat: 3,
    championName,
    sourceGraphicId: 'hero-301-anim',
    sourceGraphic: 'Hero_301_Anim',
    defaultSequenceIndex: 0,
    defaultFrameIndex: 0,
    assetBytes: rawBuffer.length,
  })

  heroItem.sequences = [
    {
      sequenceIndex: 0,
      frameCount: 4,
      pieceCount: 1,
      firstRenderableFrameIndex: 0,
      bounds: { minX: -0.05, minY: 0, maxX: 1.05, maxY: 1 },
    },
    {
      sequenceIndex: 1,
      frameCount: 4,
      pieceCount: 1,
      firstRenderableFrameIndex: 0,
      bounds: { minX: 0, minY: 0, maxX: 3, maxY: 1 },
    },
  ]

  await writeJson(visualsFile, {
    updatedAt: '2026-04-25',
    items: [
      {
        championId: '301',
        seat: 3,
        name: championName,
        portrait: null,
        base: createDecodedPngAsset({
          graphicId: 'hero-301-static',
          sourceGraphic: 'Hero_301_Static',
          color: [12, 34, 56],
          remotePath: '/Portraits/Hero_301_Static',
        }),
        skins: [],
      },
    ],
  })
  await writeAnimationCollection(tempDir, [heroItem], rawBuffer)

  await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  const output = (await JSON.parse(
    await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'),
  )) as IllustrationCollection
  const heroIllustration = output.items.find((item) => item.id === 'hero:301')
  const heroPng = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'heroes', '301.png')))

  expect(heroIllustration).toBeTruthy()
  expect(heroIllustration?.render.sequenceIndex).toBe(1)
  expect(heroIllustration?.render.frameIndex).toBe(0)
  expect(heroIllustration?.render.bounds).toEqual({ minX: 0, minY: 0, maxX: 3, maxY: 1 })
  expect(heroIllustration?.image.width).toBe(6)
  expect(heroIllustration?.image.height).toBe(2)
  expect(Number(heroPng.data[1]) > Number(heroPng.data[0])).toBeTruthy()
  expect(heroPng.data[3]).toBe(255)
  expect(Number(heroPng.data[5]) > Number(heroPng.data[4])).toBeTruthy()
  expect(heroPng.data[7]).toBe(255)
  expect(Array.from(heroPng.data.subarray(8, 12))).toEqual([0, 0, 0, 0])
})

it('在 hero-base 没有动画包时直接报错，不再回退静态渲染', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')

  await writeJson(visualsFile, {
    updatedAt: '2026-04-16',
    items: [
      {
        championId: '201',
        seat: 2,
        name: { original: 'Fallback Hero', display: '回退英雄' },
        portrait: null,
        base: createDecodedPngAsset({
          graphicId: 'hero-201',
          sourceGraphic: 'Hero_201',
          color: [0, 255, 0],
          remotePath: '/Portraits/Hero_201',
        }),
        skins: [],
      },
    ],
  })
  await writeJson(path.join(tempDir, 'champion-animations.json'), {
    updatedAt: '2026-04-16',
    items: [],
  })

  await expect(
    syncChampionIllustrations({
      visualsFile,
      outputDir: tempDir,
      currentVersion: 'v1',
    }),
  ).rejects.toThrow(/以下英雄缺少本地动画清单，请先同步 champion-animations：201/)
})

it('在集合 updatedAt 未变新时整批跳过，不重渲染 PNG', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')

  await writeJson(visualsFile, {
    updatedAt: '2026-04-16',
    items: [],
  })
  await writeJson(path.join(tempDir, 'champion-animations.json'), {
    updatedAt: '2026-04-16',
    items: [],
  })
  await writeJson(path.join(tempDir, 'champion-illustrations.json'), {
    updatedAt: '2026-04-16',
    items: [
      {
        id: 'hero:101',
        championId: '101',
        skinId: null,
        kind: 'hero-base',
        seat: 1,
        championName: { original: 'Animation Hero', display: '动画像英雄' },
        illustrationName: { original: 'Animation Hero', display: '动画像英雄' },
        portraitPath: null,
        sourceSlot: 'base',
        sourceGraphicId: 'hero-101-anim',
        sourceGraphic: 'Hero_101_Anim',
        sourceVersion: 1,
        render: { pipeline: 'skelanim', sequenceIndex: 1, sequenceLength: 2, isStaticPose: false, frameIndex: 1, visiblePieceCount: 2, bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } },
        image: {
          path: 'v1/champion-illustrations/heroes/101.png',
          width: 2,
          height: 2,
          bytes: 10,
          format: 'png',
        },
      },
    ],
  })

  const result = await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  expect(result.skipped).toBe(true)
  expect(result.renderedCount).toBe(0)
  expect(result.reusedCount).toBe(1)
  expect(result.counts.totalIllustrations).toBe(1)
})

it('在源动画未变化且输出 PNG 相同时复用已有文件', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const championName = { original: 'Reuse Hero', display: '复用英雄' }
  const heroItem = createHeroAnimationManifestItem({
    championId: '101',
    seat: 1,
    championName,
    sourceGraphicId: 'hero-101-anim',
    sourceGraphic: 'Hero_101_Anim',
    defaultSequenceIndex: 1,
    defaultFrameIndex: 1,
    assetBytes: 0,
  })

  await writeJson(visualsFile, {
    updatedAt: '2026-04-17',
    items: [
      {
        championId: '101',
        seat: 1,
        name: championName,
        portrait: null,
        base: createDecodedPngAsset({
          graphicId: 'hero-static',
          sourceGraphic: 'Hero_Static',
          color: [12, 34, 56],
          remotePath: '/Portraits/Hero_Static',
        }),
        skins: [],
      },
    ],
  })
  await writeAnimationCollection(tempDir, [heroItem])
  await writeJson(path.join(tempDir, 'champion-illustrations.json'), {
    updatedAt: '2026-04-15',
    items: [],
  })

  await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  const firstBytes = await readFile(path.join(tempDir, 'champion-illustrations', 'heroes', '101.png'))
  await writeJson(path.join(tempDir, 'champion-illustrations.json'), {
    updatedAt: '2026-04-16',
    items: [
      {
        id: 'hero:101',
        championId: '101',
        skinId: null,
        kind: 'hero-base',
        seat: 1,
        championName,
        illustrationName: championName,
        portraitPath: null,
        sourceSlot: 'base',
        sourceGraphicId: 'hero-101-anim',
        sourceGraphic: 'Hero_101_Anim',
        sourceVersion: 1,
        render: {
          pipeline: 'skelanim',
          sequenceIndex: 1,
          sequenceLength: 2,
          isStaticPose: false,
          frameIndex: 1,
          visiblePieceCount: 2,
          bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        },
        image: {
          path: 'v1/champion-illustrations/heroes/101.png',
          width: 2,
          height: 2,
          bytes: firstBytes.length,
          format: 'png',
        },
      },
    ],
  })

  const result = await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  const secondBytes = await readFile(path.join(tempDir, 'champion-illustrations', 'heroes', '101.png'))
  expect(secondBytes.equals(firstBytes)).toBe(true)
  expect(result.renderedCount).toBe(0)
  expect(result.reusedCount).toBe(1)
})

it('在 skinIds 局部重渲染时保留既有清单与图片', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const illustrationRoot = path.join(tempDir, 'champion-illustrations')
  const rawBuffer = createSkelAnimRawBuffer()
  const animationItem = createSkinAnimationManifestItem({
    championId: '101',
    skinId: '501',
    seat: 1,
    championName: { original: 'Hero One', display: '英雄一' },
    illustrationName: { original: 'Skin One', display: '皮肤一' },
    sourceSlot: 'large',
    sourceGraphicId: 'skin-501-anim',
    sourceGraphic: 'Skin_501_Anim',
    defaultSequenceIndex: 1,
    defaultFrameIndex: 1,
    assetBytes: rawBuffer.length,
  })

  await writeJson(visualsFile, {
    updatedAt: '2026-04-16',
    items: [
      {
        championId: '101',
        seat: 1,
        name: { original: 'Hero One', display: '英雄一' },
        portrait: null,
        base: createDecodedPngAsset({
          graphicId: 'hero-101',
          sourceGraphic: 'Hero_101',
          color: [10, 20, 30],
          remotePath: '/Portraits/Hero_101',
        }),
        skins: [
          {
            id: '501',
            name: { original: 'Skin One', display: '皮肤一' },
            portrait: null,
            base: null,
            large: null,
            xl: null,
          },
        ],
      },
      {
        championId: '102',
        seat: 2,
        name: { original: 'Hero Two', display: '英雄二' },
        portrait: null,
        base: createDecodedPngAsset({
          graphicId: 'hero-102',
          sourceGraphic: 'Hero_102',
          color: [20, 30, 40],
          remotePath: '/Portraits/Hero_102',
        }),
        skins: [
          {
            id: '601',
            name: { original: 'Skin Two', display: '皮肤二' },
            portrait: null,
            base: null,
            large: null,
            xl: null,
          },
        ],
      },
    ],
  })

  await mkdir(path.join(illustrationRoot, 'heroes'), { recursive: true })
  await mkdir(path.join(illustrationRoot, 'skins'), { recursive: true })
  await writeFile(path.join(illustrationRoot, 'heroes', '999.png'), Buffer.from('keep-hero'))
  await writeFile(path.join(illustrationRoot, 'skins', '601.png'), Buffer.from('keep-skin'))
  await writeJson(path.join(tempDir, 'champion-illustrations.json'), {
    updatedAt: '2026-04-15',
    items: [
      {
        id: 'hero:999',
        championId: '999',
        skinId: null,
        kind: 'hero-base',
        seat: 9,
        championName: { original: 'Hero Keep', display: '保留英雄' },
        illustrationName: { original: 'Hero Keep', display: '保留英雄' },
        portraitPath: null,
        sourceSlot: 'base',
        sourceGraphicId: 'hero-keep',
        sourceGraphic: 'Hero_Keep',
        sourceVersion: 1,
        render: {
          pipeline: 'decoded-png',
          sequenceIndex: null,
          sequenceLength: null,
          isStaticPose: null,
          frameIndex: null,
          visiblePieceCount: null,
          bounds: null,
        },
        image: {
          path: 'v1/champion-illustrations/heroes/999.png',
          width: 1,
          height: 1,
          bytes: 9,
          format: 'png',
        },
      },
      {
        id: 'skin:601',
        championId: '102',
        skinId: '601',
        kind: 'skin',
        seat: 2,
        championName: { original: 'Hero Two', display: '英雄二' },
        illustrationName: { original: 'Skin Two', display: '皮肤二' },
        portraitPath: null,
        sourceSlot: 'base',
        sourceGraphicId: 'skin-601',
        sourceGraphic: 'Skin_601',
        sourceVersion: 1,
        render: {
          pipeline: 'decoded-png',
          sequenceIndex: null,
          sequenceLength: null,
          isStaticPose: null,
          frameIndex: null,
          visiblePieceCount: null,
          bounds: null,
        },
        image: {
          path: 'v1/champion-illustrations/skins/601.png',
          width: 1,
          height: 1,
          bytes: 9,
          format: 'png',
        },
      },
    ],
  })
  await writeAnimationCollection(tempDir, [animationItem], rawBuffer)

  await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
    skinIds: '501',
  })

  const output = (await JSON.parse(
    await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'),
  )) as IllustrationCollection
  const ids = output.items.map((item) => item.id)
  const updatedSkin = output.items.find((item) => item.id === 'skin:501')

  expect(ids).toEqual(['skin:501', 'skin:601', 'hero:999'])
  expect(updatedSkin).toBeTruthy()
  expect(updatedSkin?.sourceGraphicId).toBe('skin-501-anim')
  expect(updatedSkin?.render.sequenceIndex).toBe(1)
  expect(updatedSkin?.render.frameIndex).toBe(1)
  expect((await readFile(path.join(illustrationRoot, 'heroes', '999.png'))).equals(Buffer.from('keep-hero'))).toBe(true)
  expect((await readFile(path.join(illustrationRoot, 'skins', '601.png'))).equals(Buffer.from('keep-skin'))).toBe(true)
})
