import zlib from 'node:zlib'
import { Buffer } from 'node:buffer'
import { expect, it } from 'vitest'
import { PNG } from 'pngjs'
import { unwrap } from '../../tests/utils/dom-assertions'
import { decodeSkelAnimGraphicBuffer } from './skelanim-codec.ts'
import {
  computeSkelAnimFrameBounds,
  renderSkelAnimPoseToPngBuffer,
  selectBestSkelAnimPose,
} from './skelanim-renderer.ts'

interface SkelAnimTestFrame {
  depth: number
  rotation: number
  scaleX: number
  scaleY: number
  x: number
  y: number
}

interface SkelAnimTestPiece {
  textureId: number
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  centerX: number
  centerY: number
  frames: (SkelAnimTestFrame | null)[]
}

interface SkelAnimTestSequence {
  length: number
  pieces: SkelAnimTestPiece[]
}

interface SkelAnimTestCharacter {
  name: string
  sequences: SkelAnimTestSequence[]
}

interface SkelAnimTestAssetConfig {
  sheetWidth: number
  sheetHeight: number
  textures: Buffer[]
  characters: SkelAnimTestCharacter[]
}

function createSolidTexture(
  width: number,
  height: number,
  colorByPixel: (x: number, y: number) => [number, number, number, number],
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

function buildSkelAnimAssetBuffer({
  sheetWidth,
  sheetHeight,
  textures,
  characters,
}: SkelAnimTestAssetConfig): Buffer {
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

it('decodeSkelAnimGraphicBuffer 解析 frame 字段顺序与 piece 数据', () => {
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
  const character = unwrap(decoded.characters[0], 'characters[0] 应存在')
  const sequence = unwrap(character.sequences[0], 'sequences[0] 应存在')
  const piece = unwrap(sequence.pieces[0], 'pieces[0] 应存在')
  const frame = piece.frames[0]

  expect(decoded.sheetWidth).toBe(16)
  expect(decoded.sheetHeight).toBe(16)
  expect(decoded.textures.length).toBe(1)
  expect(character.name).toBe('TestHero')
  expect(piece).toEqual({
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
  expect(frame).toEqual({
    depth: 9,
    rotation: 0.25,
    scaleX: 1.5,
    scaleY: -2,
    x: 10,
    y: -20,
  })
})

it('renderSkelAnimPoseToPngBuffer 按 depth 覆盖 piece 并输出正确尺寸', async () => {
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

  expect(rendered.width).toBe(2)
  expect(rendered.height).toBe(2)

  for (let index = 0; index < png.data.length; index += 4) {
    expect(png.data[index]).toBe(0)
    expect(png.data[index + 1]).toBe(0)
    expect(png.data[index + 2]).toBe(255)
    expect(png.data[index + 3]).toBe(255)
  }
})

it('renderSkelAnimPoseToPngBuffer 以正 y 向下堆叠 piece', async () => {
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

  expect(rendered.width).toBe(1)
  expect(rendered.height).toBe(3)

  const topPixel = png.data.subarray(0, 4)
  const middlePixel = png.data.subarray(4, 8)
  const bottomPixel = png.data.subarray(8, 12)

  expect(Array.from(topPixel)).toEqual([255, 0, 0, 255])
  expect(Array.from(middlePixel)).toEqual([0, 0, 0, 0])
  expect(Array.from(bottomPixel)).toEqual([0, 0, 255, 255])
})

it('renderSkelAnimPoseToPngBuffer 支持用更大的 viewport 输出首帧 poster', async () => {
  const texture = createSolidTexture(1, 1, () => [0, 255, 0, 255])
  const rawBuffer = buildSkelAnimAssetBuffer({
    sheetWidth: 1,
    sheetHeight: 1,
    textures: [texture],
    characters: [
      {
        name: 'PosterHero',
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
  const decoded = decodeSkelAnimGraphicBuffer(testAsset, rawBuffer)
  const rendered = await renderSkelAnimPoseToPngBuffer(decoded, {
    sequenceIndex: 0,
    frameIndex: 0,
    viewportBounds: { minX: 0, minY: 0, maxX: 3, maxY: 1, width: 3, height: 1, visiblePieceCount: 1 },
  })
  const png = PNG.sync.read(rendered.bytes)

  expect(rendered.width).toBe(3)
  expect(rendered.height).toBe(1)
  expect(rendered.render.bounds).toEqual({ minX: 0, minY: 0, maxX: 3, maxY: 1 })
  expect(Array.from(png.data.subarray(0, 4))).toEqual([0, 0, 0, 0])
  expect(Array.from(png.data.subarray(4, 8))).toEqual([0, 255, 0, 255])
  expect(Array.from(png.data.subarray(8, 12))).toEqual([0, 0, 0, 0])
})

it('SkelAnim 几何遵循 kleho 的正 rotation 与先 scale 后 rotate', async () => {
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
  const character = unwrap(decoded.characters[0], 'characters[0] 应存在')
  const sequence = unwrap(character.sequences[0], 'sequences[0] 应存在')
  const bounds = computeSkelAnimFrameBounds(sequence, 0)
  const rendered = await renderSkelAnimPoseToPngBuffer(decoded, {
    sequenceIndex: 0,
    frameIndex: 0,
  })
  const png = PNG.sync.read(rendered.bytes)

  expect(bounds).toBeTruthy()
  const b = unwrap(bounds, 'bounds 应非空')
  expect(Math.abs(b.minX + 2)).toBeLessThan(1e-9)
  expect(Math.abs(b.minY)).toBeLessThan(1e-9)
  expect(Math.abs(b.maxX)).toBeLessThan(1e-9)
  expect(Math.abs(b.maxY - 1)).toBeLessThan(1e-9)
  expect(b.width).toBe(2)
  expect(b.height).toBe(1)
  expect(b.visiblePieceCount).toBe(1)
  expect(rendered.width).toBe(2)
  expect(rendered.height).toBe(1)
  expect(Array.from(png.data.subarray(0, 4))).toEqual([255, 0, 0, 255])
  expect(Array.from(png.data.subarray(4, 8))).toEqual([255, 0, 0, 255])
})

it('selectBestSkelAnimPose 默认选择第一个 sequence 的首帧', () => {
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
  const character = unwrap(decoded.characters[0], 'characters[0] 应存在')
  const pose = selectBestSkelAnimPose(character)

  expect(pose.sequenceIndex).toBe(0)
  expect(pose.frameIndex).toBe(0)
  expect(Math.round(pose.width)).toBe(2)
  expect(Math.round(pose.height)).toBe(2)
})

it('selectBestSkelAnimPose 跳过不可渲染首帧并继续找同 sequence 的后续帧', () => {
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
  const character = unwrap(decoded.characters[0], 'characters[0] 应存在')
  const pose = selectBestSkelAnimPose(character)

  expect(pose.sequenceIndex).toBe(0)
  expect(pose.frameIndex).toBe(1)
})

it('selectBestSkelAnimPose 按 preferredSequenceIndexes 与 preferredFrameIndexes 优先选 pose', () => {
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
  const character = unwrap(decoded.characters[0], 'characters[0] 应存在')
  const pose = selectBestSkelAnimPose(character, {
    preferredSequenceIndexes: [1, 0],
    preferredFrameIndexes: [0],
  })

  expect(pose.sequenceIndex).toBe(1)
  expect(pose.frameIndex).toBe(0)
  expect(Math.round(pose.width)).toBe(6)
  expect(Math.round(pose.height)).toBe(6)
})
