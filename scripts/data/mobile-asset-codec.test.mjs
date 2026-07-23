import { test } from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import { PNG } from 'pngjs'
import {
  decodeRemoteGraphicBuffer,
  decodeGraphicBufferWithFallback,
  extractWrappedPngBuffer,
  findPngSignatureOffset,
  getPngDimensions,
  readPngDimensions,
} from './mobile-asset-codec.ts'

function makePngBuffer() {
  const png = new PNG({ width: 2, height: 2 })
  for (let i = 0; i < png.data.length; i += 1) {
    png.data[i] = (i * 37) % 256
  }
  return PNG.sync.write(png)
}

function wrapWithPrefix(pngBuffer, prefixLength) {
  const wrapper = Buffer.concat([Buffer.alloc(prefixLength, 0xaa), pngBuffer])
  return wrapper
}

test('findPngSignatureOffset 定位 PNG 头偏移', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 5)
  assert.equal(findPngSignatureOffset(wrapped), 5)
  assert.equal(findPngSignatureOffset(Buffer.alloc(10)), -1)
})

test('extractWrappedPngBuffer 从前缀包内提取并截到 IEND', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 3)
  const extracted = extractWrappedPngBuffer(wrapped)
  assert.equal(findPngSignatureOffset(extracted), 0)
  assert.ok(extracted.length <= png.length)
})

test('decodeRemoteGraphicBuffer 处理 wrapped-png 与 zlib-png', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 4)
  const asset = { delivery: 'wrapped-png' }
  assert.equal(decodeRemoteGraphicBuffer(asset, wrapped)[0], 0x89)

  const zlibAsset = { delivery: 'zlib-png' }
  const inflated = zlib.deflateSync(wrapped)
  assert.equal(decodeRemoteGraphicBuffer(zlibAsset, inflated)[0], 0x89)
})

test('decodeRemoteGraphicBuffer 不支持的 delivery 抛错', () => {
  assert.throws(() => decodeRemoteGraphicBuffer({ delivery: 'unknown' }, Buffer.alloc(4)), /暂不支持解析/)
})

test('readPngDimensions 读取偏移 0 的 PNG 尺寸，非 PNG 抛错', () => {
  const png = makePngBuffer()
  assert.deepEqual(readPngDimensions(png), { width: 2, height: 2 })
  assert.throws(() => readPngDimensions(Buffer.alloc(24)), /不是可识别的 PNG/)
})

test('getPngDimensions 按偏移读取 wrapped PNG 尺寸，越界返回 null', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 6)
  assert.deepEqual(getPngDimensions(wrapped, 6), { width: 2, height: 2 })
  assert.equal(getPngDimensions(wrapped, -1), null)
  assert.equal(getPngDimensions(wrapped, wrapped.length - 5), null)
})

test('decodeGraphicBufferWithFallback 标注正确时直接命中', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 2)
  const result = decodeGraphicBufferWithFallback({ delivery: 'wrapped-png', graphicId: '7' }, wrapped)
  assert.equal(result.delivery, 'wrapped-png')
  assert.equal(result.buffer[0], 0x89)
})

test('decodeGraphicBufferWithFallback 标注错误时回退到 zlib-png', () => {
  const png = makePngBuffer()
  const wrapped = wrapWithPrefix(png, 2)
  const inflated = zlib.deflateSync(wrapped)
  // 标注成错误 delivery，wrapped-png 也解不出（实际是 zlib），最终靠 zlib-png 回退命中
  const result = decodeGraphicBufferWithFallback({ delivery: 'mislabeled', graphicId: '9' }, inflated)
  assert.equal(result.delivery, 'zlib-png')
  assert.equal(result.buffer[0], 0x89)
})

test('decodeGraphicBufferWithFallback 全部失败时抛出含 graphicId 的错误', () => {
  assert.throws(
    () => decodeGraphicBufferWithFallback({ delivery: 'unknown', graphicId: '42' }, Buffer.alloc(8, 0)),
    /无法解析 graphic 42/,
  )
})
