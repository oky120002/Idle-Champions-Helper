import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../src/data/client', () => ({
  loadCollection: vi.fn(),
}))

import { I18nProvider } from '../../src/app/i18n'
import { loadCollection } from '../../src/data/client'
import { ChampionsPage } from '../../src/pages/ChampionsPage'
import type { Champion, DataCollection, LocalizedText } from '../../src/domain/types'

interface StringEnumGroup {
  id: string
  values: string[]
}

interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

function localized(original: string, display: string): LocalizedText {
  return { original, display }
}

const hall = localized('Companions of the Hall', '大厅伙伴团')
const adversaries = localized('Absolute Adversaries', '绝对宿敌')
const oxventurers = localized('Oxventurers Guild', '牛冒险者公会')

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'alpha',
      name: localized('Alpha', '阿尔法'),
      seat: 1,
      roles: ['support'],
      affiliations: [hall],
      tags: ['starter'],
    },
    {
      id: 'beta',
      name: localized('Beta', '贝塔'),
      seat: 2,
      roles: ['healing'],
      affiliations: [hall],
      tags: ['healer'],
    },
    {
      id: 'gamma',
      name: localized('Gamma', '伽马'),
      seat: 2,
      roles: ['dps'],
      affiliations: [adversaries],
      tags: ['damage'],
    },
    {
      id: 'delta',
      name: localized('Delta', '德尔塔'),
      seat: 3,
      roles: ['tank'],
      affiliations: [oxventurers],
      tags: ['frontline'],
    },
  ],
}

const enumsFixture: DataCollection<StringEnumGroup | LocalizedEnumGroup> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'roles',
      values: ['support', 'healing', 'dps', 'tank'],
    },
    {
      id: 'affiliations',
      values: [hall, adversaries, oxventurers],
    },
  ],
}

const manyChampionsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: Array.from({ length: 60 }, (_, index) => ({
    id: `generated-${index + 1}`,
    name: localized(`Generated Hero ${index + 1}`, `测试英雄 ${index + 1}`),
    seat: (index % 12) + 1,
    roles: [['support'], ['healing'], ['dps'], ['tank']][index % 4],
    affiliations: [[hall], [adversaries], [oxventurers]][index % 3],
    tags: [`tag-${index + 1}`],
  })),
}

const mockedLoadCollection = vi.mocked(loadCollection)

function renderChampionsPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <ChampionsPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champions') {
      return championsFixture
    }

    if (name === 'enums') {
      return enumsFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
})

describe('ChampionsPage filters', () => {
  it('支持座位多选，并且再次点击已选项会取消选择', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '1 号位' }))
    await user.click(screen.getByRole('button', { name: '2 号位' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.getByText('贝塔')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
    expect(screen.getByText('当前筛选：座位：1 号位、2 号位')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '1 号位' }))

    await waitFor(() => {
      expect(screen.queryByText('阿尔法')).not.toBeInTheDocument()
    })

    expect(screen.getByText('贝塔')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.getByText('当前筛选：座位：2 号位')).toBeInTheDocument()
  })

  it('支持定位和联动队伍多选，并继续按维度组合结果', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '辅助' }))
    await user.click(screen.getByRole('button', { name: '输出' }))
    await user.click(screen.getByRole('button', { name: '大厅伙伴团' }))
    await user.click(screen.getByRole('button', { name: '绝对宿敌' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        '当前筛选：定位：辅助、输出 · 联动队伍：大厅伙伴团 · Companions of the Hall、绝对宿敌 · Absolute Adversaries',
      ),
    ).toBeInTheDocument()
  })

  it('无匹配时提供放开筛选和清空全部的快捷操作', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('搜英雄名、标签、联动队伍'), '德')
    await user.click(screen.getByRole('button', { name: '1 号位' }))

    expect(
      screen.getByText('当前筛选条件下没有匹配英雄，可以先放开座位、定位、联动队伍，或一键清空全部条件。'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '放开座位 / 定位 / 联动' }))

    await waitFor(() => {
      expect(screen.getByText('德尔塔')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('德')).toBeInTheDocument()
    expect(screen.queryByText('阿尔法')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清空全部' }))

    await waitFor(() => {
      expect(screen.getByText('阿尔法')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('搜英雄名、标签、联动队伍')).toHaveValue('')
  })

  it('默认先展示 48 名英雄，并支持切换到显示全部再收起', async () => {
    const user = userEvent.setup()

    mockedLoadCollection.mockImplementation(async (name) => {
      if (name === 'champions') {
        return manyChampionsFixture
      }

      if (name === 'enums') {
        return enumsFixture
      }

      throw new Error(`unexpected collection: ${name}`)
    })

    renderChampionsPage()

    expect(await screen.findByText('测试英雄 1')).toBeInTheDocument()
    expect(screen.getByText('默认先展示 48 名英雄')).toBeInTheDocument()
    expect(screen.getByText(/^当前展示 48 \/ 60 名英雄/)).toBeInTheDocument()
    expect(screen.queryByText('测试英雄 60')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '显示全部 60 名' }))

    await waitFor(() => {
      expect(screen.getByText('测试英雄 60')).toBeInTheDocument()
    })

    expect(screen.getByText(/^当前展示 60 \/ 60 名英雄/)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '收起到默认 48 名' })[0])

    await waitFor(() => {
      expect(screen.queryByText('测试英雄 60')).not.toBeInTheDocument()
    })

    expect(screen.getByText(/^当前展示 48 \/ 60 名英雄/)).toBeInTheDocument()
  })
})
