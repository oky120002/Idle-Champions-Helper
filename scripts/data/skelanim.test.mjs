import test from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import { PNG } from 'pngjs'
import { decodeSkelAnimGraphicBuffer } from './skelanim-codec.mjs'
import {
  computeSkelAnimFrameBounds,
  renderSkelAnimPoseToPngBuffer,
  selectBestSkelAnimPose,
} from './skelanim-renderer.mjs'

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

const testAsset = {
  delivery: 'zlib-png',
}

test('decodeSkelAnimGraphicBuffer 解析 frame 字段顺序与 piece 数据', () => {
  const texture = createSolidTexture(2, 2, () => [255, 0, 0, 255])
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 16,
    sheetHeight: 16,
    textures: [texture],
    characters: [
      {
        name: 'TestHero',
        sequences: [
          {
            length: 1,
            pieces: [
              {
                textureId: 0,
                sourceX: 3,
                sourceY: 4,
                sourceWidth: 5,
                sourceHeight: 6,
                centerX: 7,
                centerY: 8,
                frames: [
                  {
                    depth: 9,
                    rotation: 0.25,
                    scaleX: 1.5,
                    scaleY: -2,
                    x: 10,
                    y: -20,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const frame = decoded.characters[0].sequences[0].pieces[0].frames[0]

  assert.equal(decoded.sheetWidth, 16)
  assert.equal(decoded.sheetHeight, 16)
  assert.equal(decoded.textures.length, 1)
  assert.equal(decoded.characters[0].name, 'TestHero')
  assert.deepEqual(decoded.characters[0].sequences[0].pieces[0], {
    pieceIndex: 0,
    textureId: 0,
    sourceX: 3,
    sourceY: 4,
    sourceWidth: 5,
    sourceHeight: 6,
    centerX: 7,
    centerY: 8,
    frames: [frame],
  })
  assert.deepEqual(frame, {
    depth: 9,
    rotation: 0.25,
    scaleX: 1.5,
    scaleY: -2,
    x: 10,
    y: -20,
  })
})

test('renderSkelAnimPoseToPngBuffer 按 depth 覆盖 piece 并输出正确尺寸', async () => {
  const texture = createSolidTexture(4, 2, (x) => (x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]))
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 4,
    sheetHeight: 2,
    textures: [texture],
    characters: [
      {
        name: 'LayeredHero',
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
                sourceX: 2,
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
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const rendered = await renderSkelAnimPoseToPngBuffer(decoded, {
    sequenceIndex: 0,
    frameIndex: 0,
  })
  const png = PNG.sync.read(rendered.bytes)

  assert.equal(rendered.width, 2)
  assert.equal(rendered.height, 2)

  for (let index = 0; index < png.data.length; index += 4) {
    assert.equal(png.data[index], 0)
    assert.equal(png.data[index + 1], 0)
    assert.equal(png.data[index + 2], 255)
    assert.equal(png.data[index + 3], 255)
  }
})

test('renderSkelAnimPoseToPngBuffer 以正 y 向下堆叠 piece', async () => {
  const texture = createSolidTexture(2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255]))
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 2,
    sheetHeight: 1,
    textures: [texture],
    characters: [
      {
        name: 'YAxisHero',
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
                    depth: 1,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    x: 0,
                    y: 2,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const rendered = await renderSkelAnimPoseToPngBuffer(decoded, {
    sequenceIndex: 0,
    frameIndex: 0,
  })
  const png = PNG.sync.read(rendered.bytes)

  assert.equal(rendered.width, 1)
  assert.equal(rendered.height, 3)

  const topPixel = png.data.subarray(0, 4)
  const middlePixel = png.data.subarray(4, 8)
  const bottomPixel = png.data.subarray(8, 12)

  assert.deepEqual(Array.from(topPixel), [255, 0, 0, 255])
  assert.deepEqual(Array.from(middlePixel), [0, 0, 0, 0])
  assert.deepEqual(Array.from(bottomPixel), [0, 0, 255, 255])
})

test('SkelAnim 几何遵循 kleho 的正 rotation 与先 scale 后 rotate', async () => {
  const texture = createSolidTexture(1, 1, () => [255, 0, 0, 255])
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 1,
    sheetHeight: 1,
    textures: [texture],
    characters: [
      {
        name: 'RotationHero',
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
                    rotation: Math.PI / 2,
                    scaleX: 2,
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
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const bounds = computeSkelAnimFrameBounds(decoded.characters[0].sequences[0], 0)
  const rendered = await renderSkelAnimPoseToPngBuffer(decoded, {
    sequenceIndex: 0,
    frameIndex: 0,
  })
  const png = PNG.sync.read(rendered.bytes)

  assert.ok(bounds)
  assert.ok(Math.abs(bounds.minX + 2) < 1e-9)
  assert.ok(Math.abs(bounds.minY) < 1e-9)
  assert.ok(Math.abs(bounds.maxX) < 1e-9)
  assert.ok(Math.abs(bounds.maxY - 1) < 1e-9)
  assert.equal(bounds.width, 2)
  assert.equal(bounds.height, 1)
  assert.equal(bounds.visiblePieceCount, 1)
  assert.equal(rendered.width, 2)
  assert.equal(rendered.height, 1)
  assert.deepEqual(Array.from(png.data.subarray(0, 4)), [255, 0, 0, 255])
  assert.deepEqual(Array.from(png.data.subarray(4, 8)), [255, 0, 0, 255])
})

test('selectBestSkelAnimPose 默认选择第一个 sequence 的首帧', () => {
  const texture = createSolidTexture(2, 2, () => [255, 255, 255, 255])
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 2,
    sheetHeight: 2,
    textures: [texture],
    characters: [
      {
        name: 'PoseHero',
        sequences: [
          {
            length: 2,
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
                  {
                    depth: 0,
                    rotation: 0,
                    scaleX: 3,
                    scaleY: 3,
                    x: 0,
                    y: 0,
                  },
                ],
              },
            ],
          },
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
                    scaleX: 4,
                    scaleY: 4,
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
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const pose = selectBestSkelAnimPose(decoded.characters[0])

  assert.equal(pose.sequenceIndex, 0)
  assert.equal(pose.frameIndex, 0)
  assert.equal(Math.round(pose.width), 2)
  assert.equal(Math.round(pose.height), 2)
})

test('selectBestSkelAnimPose 跳过不可渲染首帧并继续找同 sequence 的后续帧', () => {
  const texture = createSolidTexture(2, 2, () => [255, 255, 255, 255])
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 2,
    sheetHeight: 2,
    textures: [texture],
    characters: [
      {
        name: 'StaticHero',
        sequences: [
          {
            length: 2,
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
                  null,
                  {
                    depth: 0,
                    rotation: 0,
                    scaleX: 3,
                    scaleY: 3,
                    x: 0,
                    y: 0,
                  },
                ],
              },
            ],
          },
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
            ],
          },
        ],
      },
    ],
  })
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const pose = selectBestSkelAnimPose(decoded.characters[0])

  assert.equal(pose.sequenceIndex, 0)
  assert.equal(pose.frameIndex, 1)
})

test('selectBestSkelAnimPose 按 preferredSequenceIndexes 与 preferredFrameIndexes 优先选 pose', () => {
  const texture = createSolidTexture(2, 2, () => [255, 255, 255, 255])
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 2,
    sheetHeight: 2,
    textures: [texture],
    characters: [
      {
        name: 'PreferredHero',
        sequences: [
          {
            length: 2,
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
                  {
                    depth: 0,
                    rotation: 0,
                    scaleX: 2,
                    scaleY: 2,
                    x: 0,
                    y: 0,
                  },
                ],
              },
            ],
          },
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
                    scaleX: 3,
                    scaleY: 3,
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
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const pose = selectBestSkelAnimPose(decoded.characters[0], {
    preferredSequenceIndexes: [1, 0],
    preferredFrameIndexes: [0],
  })

  assert.equal(pose.sequenceIndex, 1)
  assert.equal(pose.frameIndex, 0)
  assert.equal(Math.round(pose.width), 6)
  assert.equal(Math.round(pose.height), 6)
})
