import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { syncPetsCatalog } from './sync-idle-champions-pets.mjs'

function createPng(width, height, colorByPixel) {
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-pets-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

test('syncPetsCatalog 输出宠物目录、获取方式与本地图像', async (t) => {
  const tempDir = await createTempDir(t)
  const inputFile = path.join(tempDir, 'definitions.json')
  const localizedInputFile = path.join(tempDir, 'definitions-zh.json')
  const outputDir = path.join(tempDir, 'data')
  const rawByUrl = new Map()
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

  function registerGraphic(graphicPath, pngBuffer) {
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
    const url = String(input)
    const body = rawByUrl.get(url)

    if (!body) {
      return new Response('not found', { status: 404 })
    }

    return new Response(body, { status: 200 })
  }
  t.after(() => {
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

  const result = await syncPetsCatalog({
    input: inputFile,
    localizedInput: localizedInputFile,
    outputDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
    concurrency: 2,
  })

  assert.equal(result.count, 5)
  assert.equal(result.counts.icons, 4)
  assert.equal(result.counts.illustrations, 4)
  assert.equal(result.counts.animations, 0)
  assert.equal(result.counts.gems, 1)
  assert.equal(result.counts.patron, 1)
  assert.equal(result.counts.premium, 2)
  assert.equal(result.counts.unavailable, 1)

  const pets = await readJson(path.join(outputDir, 'pets.json'))
  const animations = await readJson(path.join(outputDir, 'pet-animations.json'))
  const byId = new Map(pets.items.map((item) => [item.id, item]))
  assert.deepEqual(animations.items, [])

  const gemPet = byId.get('1')
  assert.deepEqual(gemPet.name, { original: 'Gem Sprite', display: '宝石小精灵' })
  assert.equal(gemPet.acquisition.kind, 'gems')
  assert.equal(gemPet.acquisition.gemCost, 250)
  assert.equal(gemPet.icon.width, gemPet.icon.height)
  assert.equal(gemPet.illustration.width, 4)
  assert.equal(gemPet.illustration.height, 3)

  const patronPet = byId.get('2')
  assert.equal(patronPet.acquisition.kind, 'patron')
  assert.deepEqual(patronPet.acquisition.patronName, {
    original: 'Vajra Safahr',
    display: '瓦吉拉',
  })
  assert.equal(patronPet.acquisition.patronCost, 50000)
  assert.equal(patronPet.acquisition.patronInfluence, 6500000)

  const premiumPet = byId.get('3')
  assert.equal(premiumPet.acquisition.kind, 'premium')
  assert.deepEqual(premiumPet.acquisition.premiumPackName, {
    original: 'Mythic Theme Pack',
    display: '神话主题包',
  })

  const flashSalePet = byId.get('4')
  assert.equal(flashSalePet.acquisition.kind, 'premium')
  assert.equal(flashSalePet.acquisition.sourceType, 'flash_sale')
  assert.equal(flashSalePet.acquisition.premiumPackName, null)

  const unreleasedPet = byId.get('5')
  assert.equal(unreleasedPet.isAvailable, false)
  assert.equal(unreleasedPet.acquisition.kind, 'not-yet-available')
  assert.equal(unreleasedPet.icon, null)
  assert.equal(unreleasedPet.illustration, null)
})

test('syncPetsCatalog 会把 type=3 的宠物分件资源离线合成为单张 PNG', async (t) => {
  const tempDir = await createTempDir(t)
  const inputFile = path.join(tempDir, 'definitions.json')
  const outputDir = path.join(tempDir, 'data')
  const rawByUrl = new Map()

  const texture = createPng(6, 2, (x, y) => {
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
    const url = String(input)
    const body = rawByUrl.get(url)

    if (!body) {
      return new Response('not found', { status: 404 })
    }

    return new Response(body, { status: 200 })
  }
  t.after(() => {
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

  const result = await syncPetsCatalog({
    input: inputFile,
    outputDir,
    currentVersion: 'v1',
    masterApiUrl: 'https://example.test/',
    concurrency: 1,
  })

  assert.equal(result.count, 1)
  assert.equal(result.counts.icons, 1)
  assert.equal(result.counts.illustrations, 1)
  assert.equal(result.counts.animations, 1)

  const pets = await readJson(path.join(outputDir, 'pets.json'))
  const pet = pets.items[0]
  const animations = await readJson(path.join(outputDir, 'pet-animations.json'))
  const animation = animations.items[0]

  assert.equal(pet.icon.width, 4)
  assert.equal(pet.icon.height, 4)
  assert.equal(pet.illustration.width, 16)
  assert.equal(pet.illustration.height, 8)
  assert.equal(animation.petId, '7')
  assert.equal(animation.asset.path, 'v1/pet-animations/illustrations/7.bin')
  assert.equal(animation.defaultSequenceIndex, 0)
  assert.equal(animation.defaultFrameIndex, 0)
  assert.equal(animation.sequences.length, 1)

  const iconPng = PNG.sync.read(await readFile(path.join(outputDir, 'pets', 'icons', '7.png')))
  const illustrationPng = PNG.sync.read(await readFile(path.join(outputDir, 'pets', 'illustrations', '7.png')))
  const animationBin = await readFile(path.join(outputDir, 'pet-animations', 'illustrations', '7.bin'))

  assert.equal(iconPng.width, 4)
  assert.equal(iconPng.height, 4)
  assert.equal(illustrationPng.width, 16)
  assert.equal(illustrationPng.height, 8)
  assert.ok(animationBin.length > 0)
})
