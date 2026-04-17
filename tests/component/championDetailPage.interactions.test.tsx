import { deflateSync } from 'node:zlib'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadBinaryData: vi.fn(),
    loadChampionDetail: vi.fn(),
    loadCollection: vi.fn(),
  }
})

import {
  animatedSkinFixture,
  detailFixture,
  illustrationFixture,
  specializationGraphicFixture,
} from './champion-detail/championDetailPageTestData'
import {
  mockChampionDetailCollections,
  mockedLoadBinaryData,
  mockedLoadChampionDetail,
  mockedLoadCollection,
  prepareChampionDetailDomEnvironment,
  renderChampionDetailPage,
  restoreChampionDetailDomEnvironment,
} from './champion-detail/championDetailPageTestHarness'

beforeEach(() => {
  prepareChampionDetailDomEnvironment()
  mockChampionDetailCollections()
})

afterEach(() => {
  mockedLoadChampionDetail.mockReset()
  mockedLoadBinaryData.mockReset()
  mockedLoadCollection.mockReset()
  restoreChampionDetailDomEnvironment()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function encodeUInt32LE(value: number) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value, 0)
  return buffer
}

function encodeInt32LE(value: number) {
  const buffer = Buffer.alloc(4)
  buffer.writeInt32LE(value, 0)
  return buffer
}

function encodeInt16LE(value: number) {
  const buffer = Buffer.alloc(2)
  buffer.writeInt16LE(value, 0)
  return buffer
}

function encodeDoubleLE(value: number) {
  const buffer = Buffer.alloc(8)
  buffer.writeDoubleLE(value, 0)
  return buffer
}

function encodeBoolean(value: boolean) {
  return Buffer.from([value ? 1 : 0])
}

function encodeString(value: string) {
  const bytes = Buffer.from(value, 'utf8')
  return Buffer.concat([encodeInt16LE(bytes.length), bytes])
}

function buildTestSkelAnimBuffer() {
  const chunks = [
    encodeUInt32LE(1),
    encodeUInt32LE(1),
    encodeUInt32LE(1),
    encodeUInt32LE(4),
    Buffer.from([1, 2, 3, 4]),
    encodeUInt32LE(1),
    encodeString('TestHero'),
    encodeUInt32LE(1),
    encodeUInt32LE(2),
    encodeUInt32LE(1),
    encodeUInt32LE(0),
    encodeUInt32LE(0),
    encodeUInt32LE(0),
    encodeUInt32LE(1),
    encodeUInt32LE(1),
    encodeInt32LE(0),
    encodeInt32LE(0),
    encodeBoolean(true),
    encodeUInt32LE(0),
    encodeDoubleLE(0),
    encodeDoubleLE(1),
    encodeDoubleLE(1),
    encodeDoubleLE(0),
    encodeDoubleLE(0),
    encodeBoolean(true),
    encodeUInt32LE(0),
    encodeDoubleLE(0),
    encodeDoubleLE(1),
    encodeDoubleLE(1),
    encodeDoubleLE(1),
    encodeDoubleLE(0),
  ]

  const compressed = deflateSync(Buffer.concat(chunks))
  return compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength)
}

describe('ChampionDetailPage interactions', () => {
  it('默认收起自身增伤和全队增伤，并允许按类型重新展开等级列表', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })

    expect(screen.getByRole('button', { name: /自身增伤/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /全队增伤/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /金币加成/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('自身伤害提高 100%')).not.toBeInTheDocument()
    expect(screen.queryByText('全队伤害提高 200%')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /自身增伤/ }))
    fireEvent.click(screen.getByRole('button', { name: /全队增伤/ }))

    expect(screen.getByText('自身伤害提高 100%')).toBeInTheDocument()
    expect(screen.getByText('全队伤害提高 200%')).toBeInTheDocument()
  })

  it('支持在悬浮预览里切换不同皮肤', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })

    fireEvent.click(screen.getByRole('button', { name: '打开皮肤立绘预览' }))

    expect(screen.getByRole('dialog', { name: '皮肤立绘预览' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: '巨型布布服装皮肤预览' })).toHaveAttribute(
        'src',
        '/data/v1/champion-illustrations/skins/4.png',
      )
    })
    await waitFor(() => {
      expect(screen.getByText('已命中')).toBeInTheDocument()
      expect(screen.getByText('large')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '切换皮肤：太空布布远征装' }))

    await waitFor(() => {
      expect(screen.getByRole('img', { name: '太空布布远征装皮肤预览' })).toHaveAttribute(
        'src',
        '/data/v1/champion-illustrations/skins/5.png',
      )
    })
  })

  it('命中动画资源时在皮肤预览里切到 canvas 动态播放', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)
    mockedLoadCollection.mockImplementation(async (name) => {
      if (name === 'champion-animations') {
        return {
          updatedAt: '2026-04-17',
          items: [animatedSkinFixture],
        }
      }

      if (name === 'champion-illustrations') {
        return illustrationFixture
      }

      if (name === 'champion-specialization-graphics') {
        return specializationGraphicFixture
      }

      throw new Error(`unexpected collection: ${name}`)
    })
    mockedLoadBinaryData.mockResolvedValue(buildTestSkelAnimBuffer())
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1, height: 1 })))

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })
    fireEvent.click(screen.getByRole('button', { name: '打开皮肤立绘预览' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '皮肤立绘预览' })).toBeInTheDocument()
    })
    expect(await screen.findByRole('button', { name: '暂停动画' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '巨型布布服装皮肤预览' }).tagName).toBe('CANVAS')
  })
})
