import 'fake-indexeddb/auto'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
    loadCollectionAtVersion: vi.fn(),
    loadVersion: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadCollection, loadCollectionAtVersion, loadVersion } from '../../src/data/client'
import { APP_DATABASE_NAME } from '../../src/data/localDatabase'
import { FormationPage } from '../../src/pages/FormationPage'
import type { Champion, DataCollection, DataVersion, FormationLayout } from '../../src/domain/types'

const versionFixture: DataVersion = {
  current: 'v1',
  updatedAt: '2026-04-13',
  notes: [],
}

const formationsFixture: DataCollection<FormationLayout> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'layout-campaign',
      name: {
        original: 'Grand Tour Line',
        display: '大巡游站位',
      },
      notes: {
        original: 'Campaign baseline',
        display: '战役基础布局',
      },
      slots: [{ id: 'slot-campaign-1', row: 1, column: 1 }],
      sourceContexts: [
        {
          kind: 'campaign',
          id: 'campaign-1',
          name: {
            original: 'Grand Tour of the Sword Coast',
            display: '剑湾大巡游',
          },
        },
      ],
    },
    {
      id: 'layout-adventure',
      name: {
        original: 'Dragon Run',
        display: '巨龙奔袭',
      },
      notes: {
        original: 'Adventure route',
        display: '冒险路线布局',
      },
      slots: [{ id: 'slot-adventure-1', row: 1, column: 1 }],
      sourceContexts: [
        {
          kind: 'adventure',
          id: 'adventure-1',
          name: {
            original: 'The Dragon Run',
            display: '巨龙奔袭',
          },
        },
      ],
    },
    {
      id: 'layout-variant',
      name: {
        original: 'Variant Grid',
        display: '变体网格',
      },
      notes: {
        original: 'Chaos formation',
        display: '混沌阵型',
      },
      slots: [{ id: 'slot-variant-1', row: 1, column: 1 }],
      sourceContexts: [
        {
          kind: 'variant',
          id: 'variant-1',
          name: {
            original: 'A Friendly Contest',
            display: '友谊竞赛',
          },
        },
      ],
    },
  ],
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'bruenor',
      name: {
        original: 'Bruenor',
        display: '布鲁诺',
      },
      seat: 1,
      roles: ['support'],
      affiliations: [],
      tags: [],
    },
  ],
}

const mockedLoadCollection = vi.mocked(loadCollection)
const mockedLoadCollectionAtVersion = vi.mocked(loadCollectionAtVersion)
const mockedLoadVersion = vi.mocked(loadVersion)

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)

    request.onerror = () => {
      reject(request.error ?? new Error('删除测试数据库失败。'))
    }

    request.onblocked = () => {
      reject(new Error('删除测试数据库被阻塞。'))
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

function mockDataLayer() {
  mockedLoadVersion.mockResolvedValue(versionFixture)
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'formations') {
      return formationsFixture
    }

    if (name === 'champions') {
      return championsFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
  mockedLoadCollectionAtVersion.mockImplementation(async (version, name) => {
    if (version === 'v1' && name === 'formations') {
      return formationsFixture
    }

    if (version === 'v1' && name === 'champions') {
      return championsFixture
    }

    throw new Error(`unexpected collection at version: ${version}/${name}`)
  })
}

function renderFormationPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <FormationPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

async function findLayoutSearchInput() {
  return screen.findByPlaceholderText('搜布局名、来源战役、冒险或变体')
}

beforeEach(async () => {
  await resetDatabase()
  mockDataLayer()
})

afterEach(async () => {
  mockedLoadCollection.mockReset()
  mockedLoadCollectionAtVersion.mockReset()
  mockedLoadVersion.mockReset()
  await resetDatabase()
})

describe('FormationPage layout filters', () => {
  it('可以按场景类型筛选布局按钮', async () => {
    const user = userEvent.setup()

    renderFormationPage()

    expect(await screen.findByRole('button', { name: '大巡游站位' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '巨龙奔袭' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '变体网格' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '战役' }))

    expect(screen.getByRole('button', { name: '大巡游站位' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '巨龙奔袭' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '变体网格' })).not.toBeInTheDocument()
  })

  it('支持按来源场景名称做中英混搜', async () => {
    const user = userEvent.setup()

    renderFormationPage()

    const searchInput = await findLayoutSearchInput()

    await user.type(searchInput, 'friendly')

    expect(screen.getByRole('button', { name: '变体网格' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '大巡游站位' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '巨龙奔袭' })).not.toBeInTheDocument()

    await user.clear(searchInput)
    await user.type(searchInput, '巨龙')

    expect(screen.getByRole('button', { name: '巨龙奔袭' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '大巡游站位' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '变体网格' })).not.toBeInTheDocument()
  })

  it('当前布局被筛掉时仍保留编辑内容并给出提示', async () => {
    const user = userEvent.setup()

    renderFormationPage()

    await user.click(await screen.findByRole('button', { name: '变体网格' }))
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'bruenor')
    await user.click(screen.getByRole('button', { name: '战役' }))

    expect(screen.getByText('当前正在编辑的布局不在筛选结果中')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '变体网格' })).not.toBeInTheDocument()
    expect(screen.getAllByText('变体网格').length).toBeGreaterThan(0)
    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('bruenor')
    expect(screen.getAllByText('布鲁诺').length).toBeGreaterThan(0)
  })

  it('筛选无结果时会提示放宽条件', async () => {
    const user = userEvent.setup()

    renderFormationPage()

    const searchInput = await findLayoutSearchInput()

    await user.type(searchInput, '完全不存在的布局')

    expect(screen.getByText('当前筛选条件下没有匹配布局，可以先放宽关键词或场景类型。')).toBeInTheDocument()
  })
})
