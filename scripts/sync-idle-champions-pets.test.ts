import { it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { readJson, writeJson } from './data/io-utils.ts'
import { PNG } from 'pngjs'
import { syncPetsCatalog } from './sync-idle-champions-pets.ts'

interface TestHooks {
  onTestFinished(fn: () => Promise<void> | void): void
}

type PixelColor = [number, number, number, number]

function createPng(
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

async function createTempDir(hooks: TestHooks): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-pets-'))
  hooks.onTestFinished(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

interface PetAcquisition {
  kind: string
  sourceType?: string
  gemCost?: number | null
  patronName?: { original: string; display: string } | null
  patronCost?: number | null
  patronInfluence?: number | null
  premiumPackName?: { original: string; display: string } | null
}

interface PetItem {
  id: string
  isAvailable: boolean
  icon: { width: number; height: number } | null
  illustration: { width: number; height: number } | null
  acquisition: PetAcquisition
}

interface PetsCollection {
  items: PetItem[]
  updatedAt?: string
}

interface PetAnimationItem {
  petId: string
  asset: { path: string }
  defaultSequenceIndex: number
  defaultFrameIndex: number
  sequences: unknown[]
}

interface PetAnimationsCollection {
  items: PetAnimationItem[]
  updatedAt?: string
}

interface SyncPetsResult {
  count: number
  assetCount: number
  skipped?: boolean
  counts: {
    icons: number
    illustrations: number
    animations: number
    gems: number
    patron: number
    premium: number
    unavailable: number
  }
}

it('输出宠物目录、获取方式与本地图像', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const localizedInputFile = path.join(tempDir, 'definitions-zh.json')
  const outputDir = path.join(tempDir, 'data')
  const rawByUrl = new Map<string, Buffer>()
  const iconPng = createPng(4, 2, (x, y) => {
    if (x === 0 || x === 3 || y === 0) {
      return [0, 0, 0, 0]
    }

    return [220, 120, 40, 255]
  })
  const illustrationPng = createPng(6, 5, (x, y) => {
    if (x === 0 || x === 5 || y === 0 || y === 4) {
      return [0, 0, 0, 0]
    }

    return [40, 140, 230, 255]
  })

  function registerGraphic(graphicPath: string, pngBuffer: Buffer): void {
    rawByUrl.set(
      `https://example.test/mobile_assets/${graphicPath}`,
      zlib.deflateSync(pngBuffer),
    )
  }

  registerGraphic('Familiars/GemPet', iconPng)
  registerGraphic('Familiars/GemPet_4xup', illustrationPng)
  registerGraphic('Familiars/PatronPet', iconPng)
  registerGraphic('Familiars/PatronPet_4xup', illustrationPng)
  registerGraphic('Familiars/PremiumPet', iconPng)
  registerGraphic('Familiars/PremiumPet_4xup', illustrationPng)
  registerGraphic('Familiars/FlashSalePet', iconPng)
  registerGraphic('Familiars/FlashSalePet_4xup', illustrationPng)

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = new Request(input).url
    const body = rawByUrl.get(url)

    if (!body) {
      return new Response('not found', { status: 404 })
    }

    return new Response(body as unknown as BodyInit, { status: 200 })
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  await writeJson(inputFile, {
    current_time: 1770000000,
    familiar_defines: [
      {
        id: 1,
        name: 'Gem Sprite',
        description: 'A starter pet from the gem shop.',
        graphic_id: 101,
        properties: { xl_graphic_id: 201, is_available: true },
        cost: { soft_currency: 250 },
        is_available: true,
        collections_source: { type: 'gems', cost: 250 },
      },
      {
        id: 2,
        name: 'Patron Spider',
        description: 'Purchased from a patron.',
        graphic_id: 102,
        properties: { xl_graphic_id: 202, is_available: true },
        is_available: true,
        collections_source: { type: 'patron', patron_id: 2 },
      },
      {
        id: 3,
        name: 'Theme Pack Owl',
        description: 'Bundled with a themed purchase.',
        graphic_id: 103,
        properties: { xl_graphic_id: 203, is_available: true },
        cost: { premium_item: 303 },
        is_available: true,
        collections_source: {},
      },
      {
        id: 4,
        name: 'Flash Sale Mimic',
        description: 'Only appears in premium offers.',
        graphic_id: 104,
        properties: { xl_graphic_id: 204, is_available: true },
        is_available: true,
        collections_source: { type: 'flash_sale', item_id: 904, odds: 123 },
      },
      {
        id: 5,
        name: 'Unreleased Dragon',
        description: 'Not available yet.',
        graphic_id: 0,
        properties: { xl_graphic_id: 0, is_available: false },
        is_available: false,
        collections_source: { type: 'not_yet_available' },
      },
    ],
    premium_item_defines: [
      {
        id: 303,
        name: 'Mythic Theme Pack',
        description: 'Includes a champion, a skin, and this familiar.',
        effect: [{ type: 'familiar', familiar_id: 3 }],
        properties: {},
      },
    ],
    patron_defines: [
      {
        id: 2,
        name: 'Vajra Safahr',
        currency_name: 'Symbol of Vajra',
        currency_name_plural: 'Symbols of Vajra',
      },
    ],
    patron_shop_item_defines: [
      {
        id: 42,
        patron_id: 2,
        name: 'Patron Spider',
        effects: [{ type: 'familiar', familiar_id: 2 }],
        cost: { patron_currency: 50000 },
        requirements: [{ condition: 'patron_total_influence', patron_id: 2, influence: 6500000 }],
      },
    ],
    graphic_defines: [
      { id: 101, graphic: 'Familiars/GemPet' },
      { id: 201, graphic: 'Familiars/GemPet_4xup' },
      { id: 102, graphic: 'Familiars/PatronPet' },
      { id: 202, graphic: 'Familiars/PatronPet_4xup' },
      { id: 103, graphic: 'Familiars/PremiumPet' },
      { id: 203, graphic: 'Familiars/PremiumPet_4xup' },
      { id: 104, graphic: 'Familiars/FlashSalePet' },
      { id: 204, graphic: 'Familiars/FlashSalePet_4xup' },
    ],
  })

  await writeJson(localizedInputFile, {
    current_time: 1770000000,
    familiar_defines: [
      { id: 1, name: '宝石小精灵', description: '来自宝石商店的起步宠物。' },
      { id: 2, name: '赞助商蜘蛛', description: '从赞助商商店购买。' },
      { id: 3, name: '主题包猫头鹰', description: '与主题包一同发售。' },
      { id: 4, name: '闪促宝箱怪', description: '只在高级报价里出现。' },
      { id: 5, name: '未公开幼龙', description: '当前尚未开放。' },
    ],
    premium_item_defines: [
      { id: 303, name: '神话主题包', description: '内含英雄、皮肤和这个熟悉魔宠。' },
    ],
    patron_defines: [
      {
        id: 2,
        name: '瓦吉拉',
        currency_name: '瓦吉拉徽记',
        currency_name_plural: '瓦吉拉徽记',
      },
    ],
    patron_shop_item_defines: [
      { id: 42, name: '赞助商蜘蛛' },
    ],
  })

  const result = (await syncPetsCatalog({
    input: inputFile,
    localizedInput: localizedInputFile,
    outputDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
    concurrency: '2',
  })) as SyncPetsResult

  expect(result.count).toBe(5)
  expect(result.counts.icons).toBe(4)
  expect(result.counts.illustrations).toBe(4)
  expect(result.counts.animations).toBe(0)
  expect(result.counts.gems).toBe(1)
  expect(result.counts.patron).toBe(1)
  expect(result.counts.premium).toBe(2)
  expect(result.counts.unavailable).toBe(1)

  const pets = (await readJson(path.join(outputDir, 'pets.json'))) as PetsCollection
  const animations = (await readJson(path.join(outputDir, 'pet-animations.json'))) as PetAnimationsCollection
  const byId = new Map(pets.items.map((item) => [item.id, item]))
  expect(animations.items).toEqual([])

  const gemPet = byId.get('1')
  expect(gemPet?.acquisition.kind).toBe('gems')
  expect(gemPet?.acquisition.gemCost).toBe(250)
  expect(gemPet?.icon?.width).toBe(gemPet?.icon?.height)
  expect(gemPet?.illustration?.width).toBe(4)
  expect(gemPet?.illustration?.height).toBe(3)

  const patronPet = byId.get('2')
  expect(patronPet?.acquisition.kind).toBe('patron')
  expect(patronPet?.acquisition.patronName).toEqual({
    original: 'Vajra Safahr',
    display: '瓦吉拉',
  })
  expect(patronPet?.acquisition.patronCost).toBe(50000)
  expect(patronPet?.acquisition.patronInfluence).toBe(6500000)

  const premiumPet = byId.get('3')
  expect(premiumPet?.acquisition.kind).toBe('premium')
  expect(premiumPet?.acquisition.premiumPackName).toEqual({
    original: 'Mythic Theme Pack',
    display: '神话主题包',
  })

  const flashSalePet = byId.get('4')
  expect(flashSalePet?.acquisition.kind).toBe('premium')
  expect(flashSalePet?.acquisition.sourceType).toBe('flash_sale')
  expect(flashSalePet?.acquisition.premiumPackName).toBe(null)

  const unreleasedPet = byId.get('5')
  expect(unreleasedPet?.isAvailable).toBe(false)
  expect(unreleasedPet?.acquisition.kind).toBe('not-yet-available')
  expect(unreleasedPet?.icon).toBe(null)
  expect(unreleasedPet?.illustration).toBe(null)
})

it('会把 type=3 的宠物分件资源离线合成为单张 PNG', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const rawByUrl = new Map<string, Buffer>()

  const texture = createPng(6, 2, (x) => {
    if (x <= 1) {
      return [255, 0, 0, 255]
    }

    if (x >= 4) {
      return [0, 120, 255, 255]
    }

    return [0, 0, 0, 0]
  })

  const skelAnimBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 6,
    sheetHeight: 2,
    textures: [texture],
    characters: [
      {
        name: 'AssembledPet',
        sequences: [
          {
            length: 1,
            pieces: [
              {
                textureId: 0,
                sourceX: 0,
                sourceY: 0,
                sourceWidth: 2,
                sourceHeight: 2,
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
              {
                textureId: 0,
                sourceX: 4,
                sourceY: 0,
                sourceWidth: 2,
                sourceHeight: 2,
                centerX: 0,
                centerY: 0,
                frames: [
                  {
                    depth: 1,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    x: 2,
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

  for (const graphicPath of ['Familiars/SkelIcon', 'Familiars/SkelIllustration_4xup']) {
    rawByUrl.set(`https://example.test/mobile_assets/${graphicPath}`, skelAnimBuffer)
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const url = new Request(input).url
    const body = rawByUrl.get(url)

    if (!body) {
      return new Response('not found', { status: 404 })
    }

    return new Response(body as unknown as BodyInit, { status: 200 })
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  await writeJson(inputFile, {
    current_time: 1770000000,
    familiar_defines: [
      {
        id: 7,
        name: 'Skel Pet',
        description: 'Rendered from separated pieces.',
        graphic_id: 701,
        properties: { xl_graphic_id: 702, is_available: true },
        is_available: true,
        collections_source: { type: 'gems', cost: 50 },
      },
    ],
    premium_item_defines: [],
    patron_defines: [],
    patron_shop_item_defines: [],
    graphic_defines: [
      { id: 701, type: 3, graphic: 'Familiars/SkelIcon', export_params: { sequence_override: [1] } },
      { id: 702, type: 3, graphic: 'Familiars/SkelIllustration_4xup', export_params: { sequence_override: [1] } },
    ],
  })

  const result = (await syncPetsCatalog({
    input: inputFile,
    outputDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
    concurrency: '1',
  })) as SyncPetsResult

  expect(result.count).toBe(1)
  expect(result.counts.icons).toBe(1)
  expect(result.counts.illustrations).toBe(1)
  expect(result.counts.animations).toBe(1)

  const pets = (await readJson(path.join(outputDir, 'pets.json'))) as PetsCollection
  const pet = pets.items[0]
  const animations = (await readJson(path.join(outputDir, 'pet-animations.json'))) as PetAnimationsCollection
  const animation = animations.items[0]

  expect(pet?.icon?.width).toBe(4)
  expect(pet?.icon?.height).toBe(4)
  expect(pet?.illustration?.width).toBe(16)
  expect(pet?.illustration?.height).toBe(8)
  expect(animation?.petId).toBe('7')
  expect(animation?.asset.path).toBe('v1/pet-animations/illustrations/7.bin')
  expect(animation?.defaultSequenceIndex).toBe(0)
  expect(animation?.defaultFrameIndex).toBe(0)
  expect(animation?.sequences.length).toBe(1)

  const iconPng = PNG.sync.read(await readFile(path.join(outputDir, 'pets', 'icons', '7.png')))
  const illustrationPng = PNG.sync.read(await readFile(path.join(outputDir, 'pets', 'illustrations', '7.png')))
  const animationBin = await readFile(path.join(outputDir, 'pet-animations', 'illustrations', '7.bin'))

  expect(iconPng.width).toBe(4)
  expect(iconPng.height).toBe(4)
  expect(illustrationPng.width).toBe(16)
  expect(illustrationPng.height).toBe(8)
  expect(animationBin.length > 0).toBeTruthy()
})

it('在集合 updatedAt 未变新时整批跳过，不删除现有动画 bin', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const animationFile = path.join(outputDir, 'pet-animations', 'illustrations', '7.bin')
  await mkdir(path.dirname(animationFile), { recursive: true })

  await writeJson(inputFile, {
    current_time: 1770000000,
    familiar_defines: [],
    premium_item_defines: [],
    patron_defines: [],
    patron_shop_item_defines: [],
    graphic_defines: [],
  })
  await writeJson(path.join(outputDir, 'pets.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        id: '7',
        name: { original: 'Skel Pet', display: 'Skel Pet' },
        description: { original: 'Rendered from separated pieces.', display: 'Rendered from separated pieces.' },
        isAvailable: true,
        iconGraphicId: '701',
        illustrationGraphicId: '702',
        acquisition: { kind: 'gems', sourceType: 'gems', gemCost: 50, premiumPackName: null, premiumPackDescription: null, patronName: null, patronCurrency: null, patronCost: null, patronInfluence: null },
        icon: null,
        illustration: { path: 'v1/pets/illustrations/7.png', width: 16, height: 8, bytes: 128, format: 'png' },
        iconSourceGraphic: null,
        iconSourceVersion: null,
        illustrationSourceGraphic: 'Familiars/SkelIllustration_4xup',
        illustrationSourceVersion: null,
      },
    ],
  })
  await writeJson(path.join(outputDir, 'pet-animations.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        id: '7',
        petId: '7',
        name: { original: 'Skel Pet', display: 'Skel Pet' },
        sourceSlot: 'illustration',
        sourceGraphicId: '702',
        sourceGraphic: 'Familiars/SkelIllustration_4xup',
        sourceVersion: null,
        fps: 24,
        defaultSequenceIndex: 0,
        defaultFrameIndex: 0,
        asset: { path: 'v1/pet-animations/illustrations/7.bin', bytes: 64, format: 'skelanim-zlib' },
        sequences: [],
      },
    ],
  })
  await writeFile(animationFile, Buffer.from('existing-pet-animation'))

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('updatedAt 未变新时不应下载宠物资源')
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = (await syncPetsCatalog({
    input: inputFile,
    outputDir,
    currentVersion: 'v1',
  })) as SyncPetsResult

  expect(result.skipped).toBe(true)
  expect(result.count).toBe(1)
  expect((await readFile(animationFile)).equals(Buffer.from('existing-pet-animation'))).toBe(true)
})

it('在源资源未变化时复用已有宠物静态图与动画 bin', async (ctx) => {
  const tempDir = await createTempDir(ctx)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const iconFile = path.join(outputDir, 'pets', 'icons', '7.png')
  const illustrationFile = path.join(outputDir, 'pets', 'illustrations', '7.png')
  const animationFile = path.join(outputDir, 'pet-animations', 'illustrations', '7.bin')
  await mkdir(path.dirname(iconFile), { recursive: true })
  await mkdir(path.dirname(illustrationFile), { recursive: true })
  await mkdir(path.dirname(animationFile), { recursive: true })
  const iconPng = createPng(4, 4, () => [255, 0, 0, 255])
  const illustrationPng = createPng(16, 8, () => [0, 120, 255, 255])
  const animationBytes = Buffer.from('existing-pet-animation')

  await writeJson(inputFile, {
    current_time: 1770086400,
    familiar_defines: [
      {
        id: 7,
        name: 'Skel Pet',
        description: 'Rendered from separated pieces.',
        graphic_id: 701,
        properties: { xl_graphic_id: 702, is_available: true },
        is_available: true,
        collections_source: { type: 'gems', cost: 50 },
      },
    ],
    premium_item_defines: [],
    patron_defines: [],
    patron_shop_item_defines: [],
    graphic_defines: [
      { id: 701, type: 3, graphic: 'Familiars/SkelIcon', export_params: { sequence_override: [1] } },
      { id: 702, type: 3, graphic: 'Familiars/SkelIllustration_4xup', export_params: { sequence_override: [1] } },
    ],
  })
  await writeJson(path.join(outputDir, 'pets.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        id: '7',
        name: { original: 'Skel Pet', display: 'Skel Pet' },
        description: { original: 'Rendered from separated pieces.', display: 'Rendered from separated pieces.' },
        isAvailable: true,
        iconGraphicId: '701',
        illustrationGraphicId: '702',
        acquisition: { kind: 'gems', sourceType: 'gems', gemCost: 50, premiumPackName: null, premiumPackDescription: null, patronName: null, patronCurrency: null, patronCost: null, patronInfluence: null },
        icon: { path: 'v1/pets/icons/7.png', width: 4, height: 4, bytes: iconPng.length, format: 'png' },
        illustration: { path: 'v1/pets/illustrations/7.png', width: 16, height: 8, bytes: illustrationPng.length, format: 'png' },
        iconSourceGraphic: 'Familiars/SkelIcon',
        iconSourceVersion: null,
        illustrationSourceGraphic: 'Familiars/SkelIllustration_4xup',
        illustrationSourceVersion: null,
      },
    ],
  })
  await writeJson(path.join(outputDir, 'pet-animations.json'), {
    updatedAt: '2026-02-02',
    items: [
      {
        id: '7',
        petId: '7',
        name: { original: 'Skel Pet', display: 'Skel Pet' },
        sourceSlot: 'illustration',
        sourceGraphicId: '702',
        sourceGraphic: 'Familiars/SkelIllustration_4xup',
        sourceVersion: null,
        fps: 24,
        defaultSequenceIndex: 0,
        defaultFrameIndex: 0,
        asset: { path: 'v1/pet-animations/illustrations/7.bin', bytes: animationBytes.length, format: 'skelanim-zlib' },
        sequences: [],
      },
    ],
  })
  await writeFile(iconFile, iconPng)
  await writeFile(illustrationFile, illustrationPng)
  await writeFile(animationFile, animationBytes)

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error('命中复用时不应重新下载宠物资源')
  }
  ctx.onTestFinished(() => {
    globalThis.fetch = originalFetch
  })

  const result = (await syncPetsCatalog({
    input: inputFile,
    outputDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
    concurrency: '1',
  })) as SyncPetsResult

  expect(result.assetCount).toBe(0)
  expect(result.counts.animations).toBe(1)
  expect((await readFile(iconFile)).equals(iconPng)).toBe(true)
  expect((await readFile(illustrationFile)).equals(illustrationPng)).toBe(true)
  expect((await readFile(animationFile)).equals(animationBytes)).toBe(true)
  const pets = (await readJson(path.join(outputDir, 'pets.json'))) as PetsCollection
  const animations = (await readJson(path.join(outputDir, 'pet-animations.json'))) as PetAnimationsCollection
  expect(pets.updatedAt).toBe('2026-02-03')
  expect(animations.updatedAt).toBe('2026-02-03')
})
