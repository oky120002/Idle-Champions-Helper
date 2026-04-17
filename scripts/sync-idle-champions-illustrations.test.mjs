import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { syncChampionIllustrations } from './sync-idle-champions-illustrations.mjs'

function createSolidTexture(width, height, colorByPixel) {
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

function toDataUrl(buffer, mimeType = 'application/octet-stream') {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function createDecodedPngAsset({ graphicId, sourceGraphic, color, remotePath }) {
  const png = createSolidTexture(1, 1, () => [...color, 255])

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

function createSkelAnimRawBuffer() {
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
}) {
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
}) {
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

async function writeAnimationCollection(tempDir, items, rawBuffer = createSkelAnimRawBuffer()) {
  await mkdir(path.join(tempDir, 'champion-animations', 'heroes'), { recursive: true })
  await mkdir(path.join(tempDir, 'champion-animations', 'skins'), { recursive: true })

  for (const item of items) {
    const group = item.kind === 'hero-base' ? 'heroes' : 'skins'
    const fileId = item.kind === 'hero-base' ? item.championId : item.skinId
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

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-illustrations-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

test('syncChampionIllustrations 的皮肤与 hero-base 静态图都复用本地动画默认帧', async (t) => {
  const tempDir = await createTempDir(t)
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

  const output = JSON.parse(await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'))
  const heroIllustration = output.items.find((item) => item.id === 'hero:101')
  const skinIllustration = output.items.find((item) => item.id === 'skin:501')
  const heroPng = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'heroes', '101.png')))
  const skinPng = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'skins', '501.png')))

  assert.ok(heroIllustration)
  assert.ok(skinIllustration)
  assert.equal(heroIllustration.sourceGraphicId, 'hero-101-anim')
  assert.equal(heroIllustration.render.sequenceIndex, 1)
  assert.equal(heroIllustration.render.frameIndex, 1)
  assert.equal(heroIllustration.sourceSlot, 'base')
  assert.equal(skinIllustration.sourceGraphicId, 'g-xl')
  assert.equal(skinIllustration.render.sequenceIndex, 1)
  assert.equal(skinIllustration.render.frameIndex, 1)
  assert.equal(skinIllustration.sourceSlot, 'xl')
  assert.deepEqual(Array.from(heroPng.data), [255, 255, 0, 255])
  assert.deepEqual(Array.from(skinPng.data), [255, 255, 0, 255])
})

test('syncChampionIllustrations 在 hero-base 没有动画包时回退现有静态渲染逻辑', async (t) => {
  const tempDir = await createTempDir(t)
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

  await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
  })

  const output = JSON.parse(await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'))
  const illustration = output.items.find((item) => item.id === 'hero:201')
  const png = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'heroes', '201.png')))

  assert.ok(illustration)
  assert.equal(illustration.sourceGraphicId, 'hero-201')
  assert.equal(illustration.render.pipeline, 'decoded-png')
  assert.equal(illustration.render.sequenceIndex, null)
  assert.equal(illustration.render.frameIndex, null)
  assert.deepEqual(Array.from(png.data), [0, 255, 0, 255])
})

test('syncChampionIllustrations 在 skinIds 局部重渲染时保留既有清单与图片', async (t) => {
  const tempDir = await createTempDir(t)
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

  const output = JSON.parse(await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'))
  const ids = output.items.map((item) => item.id)
  const updatedSkin = output.items.find((item) => item.id === 'skin:501')

  assert.deepEqual(ids, ['skin:501', 'skin:601', 'hero:999'])
  assert.ok(updatedSkin)
  assert.equal(updatedSkin.sourceGraphicId, 'skin-501-anim')
  assert.equal(updatedSkin.render.sequenceIndex, 1)
  assert.equal(updatedSkin.render.frameIndex, 1)
  assert.deepEqual(await readFile(path.join(illustrationRoot, 'heroes', '999.png')), Buffer.from('keep-hero'))
  assert.deepEqual(await readFile(path.join(illustrationRoot, 'skins', '601.png')), Buffer.from('keep-skin'))
})
