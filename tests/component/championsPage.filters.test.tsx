import { render, screen, waitFor, within } from '@testing-library/react'
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
      tags: ['support', 'human', 'male', 'good', 'lawful', 'warlock', 'event', 'y2', 'control_slow', 'starter'],
    },
    {
      id: 'beta',
      name: localized('Beta', '贝塔'),
      seat: 2,
      roles: ['healing'],
      affiliations: [hall],
      tags: ['healing', 'elf', 'female', 'good', 'cleric', 'event', 'spec_gold'],
    },
    {
      id: 'gamma',
      name: localized('Gamma', '伽马'),
      seat: 2,
      roles: ['dps'],
      affiliations: [adversaries],
      tags: ['dps', 'drow', 'male', 'evil', 'rogue', 'event', 'control_stun'],
    },
    {
      id: 'delta',
      name: localized('Delta', '德尔塔'),
      seat: 3,
      roles: ['tank'],
      affiliations: [oxventurers],
      tags: ['tank', 'human', 'female', 'lawful', 'fighter', 'core', 'positional'],
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

  it('结果卡会把属性拆成结构化分组展示', async () => {
    renderChampionsPage()

    const alphaTitle = await screen.findByRole('heading', { level: 3, name: '阿尔法' })
    const alphaCard = alphaTitle.closest('article')

    expect(alphaCard).not.toBeNull()

    const alphaScope = within(alphaCard as HTMLElement)

    expect(alphaScope.getByText('种族')).toBeInTheDocument()
    expect(alphaScope.getByText('人类')).toBeInTheDocument()
    expect(alphaScope.getByText('性别')).toBeInTheDocument()
    expect(alphaScope.getByText('男性')).toBeInTheDocument()
    expect(alphaScope.getByText('阵营')).toBeInTheDocument()
    expect(alphaScope.getByText('善良')).toBeInTheDocument()
    expect(alphaScope.getByText('守序')).toBeInTheDocument()
    expect(alphaScope.getByText('职业')).toBeInTheDocument()
    expect(alphaScope.getByText('邪术师')).toBeInTheDocument()
    expect(alphaScope.getByText('获取方式')).toBeInTheDocument()
    expect(alphaScope.getByText('活动英雄')).toBeInTheDocument()
    expect(alphaScope.getByText('第 2 年活动')).toBeInTheDocument()
    expect(alphaScope.getByText('起始英雄')).toBeInTheDocument()
    expect(alphaScope.getByText('机制')).toBeInTheDocument()
    expect(alphaScope.getByText('减速控制')).toBeInTheDocument()
  })

  it('支持按种族、性别和职业筛选英雄', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '人类' }))
    await user.click(screen.getByRole('button', { name: '卓尔精灵' }))
    await user.click(screen.getByRole('button', { name: '男性' }))
    await user.click(screen.getByRole('button', { name: '邪术师' }))
    await user.click(screen.getByRole('button', { name: '盗贼' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
    expect(
      screen.getByText((content) => {
        return (
          content.includes('当前筛选：') &&
          content.includes('种族：') &&
          content.includes('人类') &&
          content.includes('卓尔精灵') &&
          content.includes('性别：男性') &&
          content.includes('职业：') &&
          content.includes('邪术师') &&
          content.includes('盗贼')
        )
      }),
    ).toBeInTheDocument()
  })

  it('支持按阵营、获取方式和机制筛选，并可单独清空已选维度', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '善良' }))
    await user.click(screen.getByRole('button', { name: '活动英雄' }))
    await user.click(screen.getByRole('button', { name: '减速控制' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()
    expect(screen.queryByText('伽马')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: '清空阵营：善良' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空获取方式：活动英雄' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空机制：减速控制' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空全部' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清空机制：减速控制' }))

    await waitFor(() => {
      expect(screen.getByText('贝塔')).toBeInTheDocument()
    })

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '清空机制：减速控制' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空阵营：善良' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空获取方式：活动英雄' })).toBeInTheDocument()
    expect(screen.queryByText('伽马')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
  })
})
