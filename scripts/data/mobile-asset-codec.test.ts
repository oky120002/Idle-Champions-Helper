import { it, expect } from 'vitest'
import zlib from 'node:zlib'
import { PNG } from 'pngjs'
import {
  decodeRemoteGraphicBuffer,
  decodeGraphicBufferWithFallback,
  extractWrappedPngBuffer,
  findPngSignatureOffset,
  getPngDimensions,
  readPngDimensions,
  type GraphicAsset,
} from './mobile-asset-codec.ts'

function makePngBuffer(): Buffer {
  const png = new PNG({ width: 2, height: 2 })
  for (let i = 0; i < png.data.length; i += 1) {
    png.data[i] = (i * 37) % 256
  }
  return PNG.sync.write(png)
}

function wrapWithPrefix(pngBuffer: Buffer, prefixLength: number): Buffer {
  const wrapper = Buffer.concat([Buffer.alloc(prefixLength, 0xaa), pngBuffer])
  return wrapper
}

it('findPngSignatureOffset 定位 PNG 头偏移', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 5)
  expect(findPngSignatureOffset(wrapped)).toBe(5)
  expect(findPngSignatureOffset(Buffer.alloc(10))).toBe(-1)
})

it('extractWrappedPngBuffer 从前缀包内提取并截到 IEND', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 3)
  const extracted = extractWrappedPngBuffer(wrapped)
  expect(findPngSignatureOffset(extracted)).toBe(0)
  expect(extracted.length).toBeLessThanOrEqual(png.length)
})

it('decodeRemoteGraphicBuffer 处理 wrapped-png 与 zlib-png', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 4)
  const asset = { delivery: 'wrapped-png' } as unknown as GraphicAsset
  expect(decodeRemoteGraphicBuffer(asset, wrapped)[0]).toBe(0x89)

  const zlibAsset = { delivery: 'zlib-png' } as unknown as GraphicAsset
  const inflated = zlib.deflateSync(wrapped)
  expect(decodeRemoteGraphicBuffer(zlibAsset, inflated)[0]).toBe(0x89)
})

it('decodeRemoteGraphicBuffer 不支持的 delivery 抛错', () => {
  expect(() =>
    decodeRemoteGraphicBuffer(
      { delivery: 'unknown' } as unknown as GraphicAsset,
      Buffer.alloc(4),
    ),
  ).toThrow(/暂不支持解析/)
})

it('readPngDimensions 读取偏移 0 的 PNG 尺寸，非 PNG 抛错', () => {
  const png = makePngBuffer()
  expect(readPngDimensions(png)).toEqual({ width: 2, height: 2 })
  expect(() => readPngDimensions(Buffer.alloc(24))).toThrow(/不是可识别的 PNG/)
})

it('getPngDimensions 按偏移读取 wrapped PNG 尺寸，越界返回 null', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 6)
  expect(getPngDimensions(wrapped, 6)).toEqual({ width: 2, height: 2 })
  expect(getPngDimensions(wrapped, -1)).toBe(null)
  expect(getPngDimensions(wrapped, wrapped.length - 5)).toBe(null)
})

it('decodeGraphicBufferWithFallback 标注正确时直接命中', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 2)
  const result = decodeGraphicBufferWithFallback(
    { delivery: 'wrapped-png', graphicId: '7' },
    wrapped,
  )
  expect(result.delivery).toBe('wrapped-png')
  expect(result.buffer[0]).toBe(0x89)
})

it('decodeGraphicBufferWithFallback 标注错误时回退到 zlib-png', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 2)
  const inflated = zlib.deflateSync(wrapped)
  // 标注成错误 delivery，wrapped-png 也解不出（实际是 zlib），最终靠 zlib-png 回退命中
  const result = decodeGraphicBufferWithFallback(
    { delivery: 'mislabeled', graphicId: '9' },
    inflated,
  )
  expect(result.delivery).toBe('zlib-png')
  expect(result.buffer[0]).toBe(0x89)
})

it('decodeGraphicBufferWithFallback 全部失败时抛出含 graphicId 的错误', () => {
  expect(() =>
    decodeGraphicBufferWithFallback(
      { delivery: 'unknown', graphicId: '42' },
      Buffer.alloc(8, 0),
    ),
  ).toThrow(/无法解析 graphic 42/)
})
