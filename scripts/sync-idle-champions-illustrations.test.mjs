import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

function createSkelAnimAsset({ graphicId, sourceGraphic, remotePath }) {
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

  const rawBuffer = buildSkelAnimAssetBuffer({
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

  return {
    graphicId,
    sourceGraphic,
    sourceVersion: 1,
    remotePath,
    remoteUrl: toDataUrl(rawBuffer),
    delivery: 'zlib-png',
    uses: [],
  }
}

async function createTempDir(t) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ic-illustrations-'))
  t.after(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })
  return tempDir
}

test('syncChampionIllustrations 支持按 skinId 覆盖 slot 选择', async (t) => {
  const tempDir = await createTempDir(t)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const overridesFile = path.join(tempDir, 'champion-illustration-overrides.json')

  await writeJson(visualsFile, {
    updatedAt: '2026-04-16',
    items: [
      {
        championId: '101',
        seat: 1,
        name: { original: 'Skin Override Hero', display: '皮肤覆盖英雄' },
        portrait: null,
        base: null,
        skins: [
          {
            id: '501',
            name: { original: 'Preferred Base', display: '优先 base' },
            portrait: null,
            base: createDecodedPngAsset({
              graphicId: 'g-base',
              sourceGraphic: 'Skin_Base',
              color: [0, 255, 0],
              remotePath: '/Portraits/Skin_Base',
            }),
            large: null,
            xl: createDecodedPngAsset({
              graphicId: 'g-xl',
              sourceGraphic: 'Skin_XL',
              color: [255, 0, 0],
              remotePath: '/Portraits/Skin_XL',
            }),
          },
        ],
      },
    ],
  })

  await writeJson(overridesFile, {
    _notes: ['测试用覆盖文件'],
    items: [
      {
        skinId: '501',
        slot: 'base',
        notes: ['皮肤 501 应优先 base'],
      },
    ],
  })

  await syncChampionIllustrations({
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
    illustrationOverrides: overridesFile,
  })

  const output = JSON.parse(await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'))
  const illustration = output.items.find((item) => item.id === 'skin:501')
  const png = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'skins', '501.png')))

  assert.ok(illustration)
  assert.equal(illustration.sourceSlot, 'base')
  assert.deepEqual(illustration.manualOverride, {
    matchedBy: ['skinId'],
    requestedSlot: 'base',
    candidateMatchedSlot: true,
    preferredSequenceIndexes: [],
    preferredFrameIndexes: [],
    notes: ['皮肤 501 应优先 base'],
  })
  assert.deepEqual(Array.from(png.data), [0, 255, 0, 255])
})

test('syncChampionIllustrations 合并 championId 与 graphicId 覆盖到 pose 选择', async (t) => {
  const tempDir = await createTempDir(t)
  const visualsFile = path.join(tempDir, 'champion-visuals.json')
  const overridesFile = path.join(tempDir, 'champion-illustration-overrides.json')
  const definitionsFile = path.join(tempDir, 'definitions.json')

  await writeJson(visualsFile, {
    updatedAt: '2026-04-16',
    items: [
      {
        championId: '201',
        seat: 2,
        name: { original: 'Pose Override Hero', display: '姿态覆盖英雄' },
        portrait: null,
        base: createSkelAnimAsset({
          graphicId: '2001',
          sourceGraphic: 'Hero_Pose_Override',
          remotePath: '/Characters/Hero_Pose_Override',
        }),
        skins: [],
      },
    ],
  })

  await writeJson(definitionsFile, {
    graphic_defines: [
      {
        id: 2001,
        export_params: {
          sequence_override: [1],
        },
      },
    ],
  })

  await writeJson(overridesFile, {
    _notes: ['测试用覆盖文件'],
    items: [
      {
        championId: '201',
        preferredFrameIndexes: [1],
        notes: ['冠军兜底优先第 1 帧'],
      },
      {
        graphicId: '2001',
        preferredSequenceIndexes: [1],
        notes: ['指定 graphic 优先第 1 个 sequence'],
      },
    ],
  })

  await syncChampionIllustrations({
    input: definitionsFile,
    visualsFile,
    outputDir: tempDir,
    currentVersion: 'v1',
    illustrationOverrides: overridesFile,
  })

  const output = JSON.parse(await readFile(path.join(tempDir, 'champion-illustrations.json'), 'utf8'))
  const illustration = output.items.find((item) => item.id === 'hero:201')
  const png = PNG.sync.read(await readFile(path.join(tempDir, 'champion-illustrations', 'heroes', '201.png')))

  assert.ok(illustration)
  assert.equal(illustration.render.sequenceIndex, 1)
  assert.equal(illustration.render.frameIndex, 1)
  assert.deepEqual(illustration.manualOverride, {
    matchedBy: ['championId', 'graphicId'],
    requestedSlot: null,
    candidateMatchedSlot: null,
    preferredSequenceIndexes: [1],
    preferredFrameIndexes: [1],
    notes: ['冠军兜底优先第 1 帧', '指定 graphic 优先第 1 个 sequence'],
  })
  assert.deepEqual(Array.from(png.data), [255, 255, 0, 255])
})
