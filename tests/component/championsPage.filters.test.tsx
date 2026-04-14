import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderChampionsPage(initialEntries: string[] = ['/champions']) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <ChampionsPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChampionsPage filters', () => {
  it('支持座位多选，并且再次点击已选项会取消选择', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    const alphaName = await screen.findByText('阿尔法')
    expect(alphaName).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看详情：阿尔法' })).toHaveAttribute('href', '/champions/alpha')
    expect(alphaName.closest('a')).toHaveAttribute('href', '/champions/alpha')

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
    const alphaCard = alphaTitle.closest('a')

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

  it('默认把低频标签筛选折叠收纳，展开后才显示补充条件', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '人类' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '活动英雄' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /身份画像/ }))

    expect(screen.getByRole('button', { name: '人类' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '善良' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '活动英雄' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /来源与机制/ }))

    expect(screen.getByRole('button', { name: '活动英雄' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '减速控制' })).toBeInTheDocument()
  })

  it('支持按种族、性别和职业筛选英雄', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /身份画像/ }))
    await user.click(screen.getByRole('button', { name: /来源与机制/ }))
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

    await user.click(screen.getByRole('button', { name: /身份画像/ }))
    await user.click(screen.getByRole('button', { name: /来源与机制/ }))
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
    expect(screen.getAllByRole('button', { name: '清空全部' })).toHaveLength(1)

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

  it('无匹配时仍可通过唯一的清空入口快速回到全量结果', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('搜英雄名、标签、联动队伍'), '德')
    await user.click(screen.getByRole('button', { name: '1 号位' }))

    expect(
      screen.getByText(
        '当前筛选条件下没有匹配英雄。可以直接点左侧已选条件逐项回退，或用筛选头部的清空全部重新开始。',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '清空全部' })).toHaveLength(1)

    await user.click(within(screen.getByRole('group', { name: '筛选状态操作' })).getByRole('button', { name: '清空全部' }))

    await waitFor(() => {
      expect(screen.getByText('阿尔法')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('搜英雄名、标签、联动队伍')).toHaveValue('')
  })

  it('支持从 URL 恢复筛选条件，并恢复上次滚动位置', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const search = '?q=alpha&seat=1&role=support&race=human&mechanic=control_slow'
    window.sessionStorage.setItem(`champions-page-scroll:${search}`, '640')

    renderChampionsPage([`/champions${search}`])

    expect(await screen.findByDisplayValue('alpha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 号位' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '人类' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '减速控制' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 640, left: 0, behavior: 'auto' })
    })

    expect(window.sessionStorage.getItem(`champions-page-scroll:${search}`)).toBeNull()
    expect(screen.getByRole('link', { name: '查看详情：阿尔法' })).toHaveAttribute(
      'href',
      '/champions/alpha?q=alpha&seat=1&role=support&race=human&mechanic=control_slow',
    )
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
