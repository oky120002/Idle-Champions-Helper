import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../data/client', () => ({
  loadBinaryData: vi.fn(),
}))

vi.mock('./browser-codec', () => ({
  decodeSkelAnimBuffer: vi.fn(),
}))

import { loadBinaryData } from '../../data/client'
import { decodeSkelAnimBuffer } from './browser-codec'
import { prepareSkelAnim, disposeAllPreparedSkelAnim } from './asset-loader'

function makeFakeImageBitmap() {
  const close = vi.fn()
  return { close, width: 1, height: 1 } as unknown as ImageBitmap
}

describe('prepareSkelAnim / asset-loader', () => {
  let originalCreateImageBitmap: typeof globalThis.createImageBitmap | undefined

  beforeEach(async () => {
    await disposeAllPreparedSkelAnim()
    vi.clearAllMocks()
    vi.mocked(loadBinaryData).mockResolvedValue(new ArrayBuffer(1))
    vi.mocked(decodeSkelAnimBuffer).mockResolvedValue({
      sheetWidth: 1,
      sheetHeight: 1,
      textures: [{ textureId: 0, bytes: new Uint8Array([0]) }],
      characters: [],
    })
    originalCreateImageBitmap = globalThis.createImageBitmap
    globalThis.createImageBitmap = vi.fn(async () => makeFakeImageBitmap())
  })

  afterEach(async () => {
    if (originalCreateImageBitmap === undefined) {
      // @ts-expect-error restore original absent state
      delete globalThis.createImageBitmap
    } else {
      globalThis.createImageBitmap = originalCreateImageBitmap
    }
    await disposeAllPreparedSkelAnim()
  })

  it('同一 path 第二次调用命中缓存，不重复加载和解码', async () => {
    await prepareSkelAnim('a.bin')
    await prepareSkelAnim('a.bin')

    expect(loadBinaryData).toHaveBeenCalledTimes(1)
    expect(decodeSkelAnimBuffer).toHaveBeenCalledTimes(1)
  })

  it('缓存超过上限时淘汰最旧条目并 close 其纹理', async () => {
    const closeSpies: ReturnType<typeof vi.fn>[] = []
    globalThis.createImageBitmap = vi.fn(async () => {
      const close = vi.fn()
      closeSpies.push(close)
      return { close, width: 1, height: 1 }
    })

    // 填满缓存（MAX_CACHE_ENTRIES = 12）
    for (let i = 0; i < 12; i++) {
      await prepareSkelAnim(`anim-${String(i)}.bin`)
    }

    expect(closeSpies).toHaveLength(12)
    for (const spy of closeSpies) {
      expect(spy).not.toHaveBeenCalled()
    }

    // 第 13 个触发 FIFO 淘汰最旧的（anim-0）
    await prepareSkelAnim('anim-12.bin')

    expect(closeSpies[0]).toHaveBeenCalledTimes(1)
    for (let i = 1; i < 12; i++) {
      expect(closeSpies[i]).not.toHaveBeenCalled()
    }
  })

  it('disposeAllPreparedSkelAnim 关闭所有缓存纹理并清空缓存', async () => {
    const closeSpies: ReturnType<typeof vi.fn>[] = []
    globalThis.createImageBitmap = vi.fn(async () => {
      const close = vi.fn()
      closeSpies.push(close)
      return { close, width: 1, height: 1 }
    })

    await prepareSkelAnim('a.bin')
    await prepareSkelAnim('b.bin')

    await disposeAllPreparedSkelAnim()

    expect(closeSpies[0]).toHaveBeenCalledTimes(1)
    expect(closeSpies[1]).toHaveBeenCalledTimes(1)

    // 清空后再次调用应重新加载
    await prepareSkelAnim('a.bin')
    expect(loadBinaryData).toHaveBeenCalledTimes(3)
  })
})
