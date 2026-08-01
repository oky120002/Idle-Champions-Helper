import { expect, it } from 'vitest'
import zlib from 'node:zlib'

import { decodeSkelAnimBuffer } from './browser-codec'

// 与 scripts/data/skelanim-codec 同格式的二进制协议；src 侧 textures 只存原始 bytes
// （不解码 PNG），夹具比 scripts 侧更轻。compress→decode 全程覆盖 src 特有的
// inflateContainer（DecompressionStream→fflate 回退）+ parseInflatedBuffer 接线。
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

interface FrameSpec {
  depth: number
  rotation: number
  scaleX: number
  scaleY: number
  x: number
  y: number
}

function encodeFrame(frame: FrameSpec | null): Buffer {
  if (!frame) {
    return Buffer.from([0])
  }

  return Buffer.concat([
    Buffer.from([1]),
    encodeUInt32LE(frame.depth),
    encodeDoubleLE(frame.rotation),
    encodeDoubleLE(frame.scaleX),
    encodeDoubleLE(frame.scaleY),
    encodeDoubleLE(frame.x),
    encodeDoubleLE(frame.y),
  ])
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8')
  return Buffer.concat([encodeInt16LE(bytes.length), bytes])
}

interface PieceSpec {
  textureId: number
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  centerX: number
  centerY: number
  frames: Array<FrameSpec | null>
}

interface SequenceSpec {
  length: number
  pieces: PieceSpec[]
}

interface CharacterSpec {
  name: string
  sequences: SequenceSpec[]
}

function buildBuffer(config: {
  sheetWidth: number
  sheetHeight: number
  textures: Buffer[]
  characters: CharacterSpec[]
}): ArrayBuffer {
  const chunks = [
    encodeUInt32LE(config.sheetWidth),
    encodeUInt32LE(config.sheetHeight),
    encodeUInt32LE(config.textures.length),
  ]

  for (const texture of config.textures) {
    chunks.push(encodeUInt32LE(texture.length), texture)
  }

  chunks.push(encodeUInt32LE(config.characters.length))

  for (const character of config.characters) {
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
          chunks.push(encodeFrame(frame))
        }
      }
    }
  }

  return toArrayBuffer(zlib.deflateSync(Buffer.concat(chunks)))
}

// node:zlib 输出 Buffer（Uint8Array 视图，可能落在共享 pool）；拷贝到独立 ArrayBuffer
// 以匹配 decodeSkelAnimBuffer 的入参契约，避免共享 pool 越界读。
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

it('decodeSkelAnimBuffer 解析 sheet/texture/character/piece/frame 全字段', async () => {
  const textureBytes = Buffer.from([0xde, 0xad, 0xbe, 0xef])
  const buffer = buildBuffer({
    sheetWidth: 16,
    sheetHeight: 32,
    textures: [textureBytes],
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
                centerY: -8,
                frames: [
                  { depth: 9, rotation: 0.25, scaleX: 1.5, scaleY: -2, x: 10, y: -20 },
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  const decoded = await decodeSkelAnimBuffer(buffer)

  expect(decoded.sheetWidth).toBe(16)
  expect(decoded.sheetHeight).toBe(32)
  expect(decoded.textures).toHaveLength(1)
  expect(decoded.textures[0]!.textureId).toBe(0)
  expect(Array.from(decoded.textures[0]!.bytes)).toEqual(Array.from(textureBytes))

  const character = decoded.characters[0]!
  expect(character.name).toBe('TestHero')
  expect(character.characterIndex).toBe(0)

  const piece = character.sequences[0]!.pieces[0]!
  expect(piece).toEqual({
    pieceIndex: 0,
    textureId: 0,
    sourceX: 3,
    sourceY: 4,
    sourceWidth: 5,
    sourceHeight: 6,
    centerX: 7,
    centerY: -8,
    frames: [{ depth: 9, rotation: 0.25, scaleX: 1.5, scaleY: -2, x: 10, y: -20 }],
  })
})

it('decodeSkelAnimBuffer 按 sequenceIndex/pieceIndex 标注序号并保留多 sequence 顺序', async () => {
  const buffer = buildBuffer({
    sheetWidth: 1,
    sheetHeight: 1,
    textures: [Buffer.from([0xff])],
    characters: [
      {
        name: 'MultiSeq',
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
                frames: [{ depth: 0, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }],
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
                sourceWidth: 1,
                sourceHeight: 1,
                centerX: 0,
                centerY: 0,
                frames: [{ depth: 1, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }],
              },
            ],
          },
        ],
      },
    ],
  })

  const decoded = await decodeSkelAnimBuffer(buffer)

  expect(decoded.characters[0]!.sequences.map((sequence) => sequence.sequenceIndex)).toEqual([0, 1])
  expect(decoded.characters[0]!.sequences[0]!.pieces[0]!.frames[0]!.depth).toBe(0)
  expect(decoded.characters[0]!.sequences[1]!.pieces[0]!.frames[0]!.depth).toBe(1)
})

it('decodeSkelAnimBuffer 将缺失帧标记为 null（布尔前缀=0）', async () => {
  const buffer = buildBuffer({
    sheetWidth: 1,
    sheetHeight: 1,
    textures: [Buffer.from([0xff])],
    characters: [
      {
        name: 'SparseHero',
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
                  null,
                  { depth: 5, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 },
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  const decoded = await decodeSkelAnimBuffer(buffer)
  const frames = decoded.characters[0]!.sequences[0]!.pieces[0]!.frames

  expect(frames).toHaveLength(2)
  expect(frames[0]).toBeNull()
  expect(frames[1]).toEqual({ depth: 5, rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 })
})

it('decodeSkelAnimBuffer 支持空字符串角色名（长度前缀=0）', async () => {
  const buffer = buildBuffer({
    sheetWidth: 1,
    sheetHeight: 1,
    textures: [],
    characters: [{ name: '', sequences: [] }],
  })

  const decoded = await decodeSkelAnimBuffer(buffer)

  expect(decoded.textures).toEqual([])
  expect(decoded.characters[0]!.name).toBe('')
  expect(decoded.characters[0]!.sequences).toEqual([])
})
