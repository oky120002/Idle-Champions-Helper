import { describe, expect, it } from 'vitest'
import {
  extractWrappedPngBytes,
  findPngSignatureOffset,
  trimPngBytesToIend,
} from '../../../src/data/remoteGraphicAsset'

const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+KobjigAAAABJRU5ErkJggg=='

function buildPngBytes(): Uint8Array {
  return Uint8Array.from(Buffer.from(SAMPLE_PNG_BASE64, 'base64'))
}

describe('remoteGraphicAsset helpers', () => {
  it('能找到 PNG 数据头偏移', () => {
    const pngBytes = buildPngBytes()
    const wrapped = new Uint8Array(12 + pngBytes.length)
    wrapped.set(new Uint8Array([1, 2, 3, 4]), 4)
    wrapped.set(pngBytes, 12)

    expect(findPngSignatureOffset(wrapped)).toBe(12)
  })

  it('能把 PNG 裁到 IEND，去掉尾部垃圾字节', () => {
    const pngBytes = buildPngBytes()
    const withTail = new Uint8Array(pngBytes.length + 6)

    withTail.set(pngBytes)
    withTail.set(new Uint8Array([1, 9, 9, 7, 7, 3]), pngBytes.length)

    expect(Array.from(trimPngBytesToIend(withTail))).toEqual(Array.from(pngBytes))
  })

  it('能从带包装头的资源里提取标准 PNG', () => {
    const pngBytes = buildPngBytes()
    const wrapped = new Uint8Array(24 + pngBytes.length + 5)

    wrapped.set(new Uint8Array(24).fill(17))
    wrapped.set(pngBytes, 24)
    wrapped.set(new Uint8Array([5, 4, 3, 2, 1]), 24 + pngBytes.length)

    expect(Array.from(extractWrappedPngBytes(wrapped))).toEqual(Array.from(pngBytes))
  })
})
