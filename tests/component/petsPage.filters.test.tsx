import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadCollection } from '../../src/data/client'
import type { DataCollection, Pet } from '../../src/domain/types'
import { PetsPage } from '../../src/pages/PetsPage'

const mockedLoadCollection = vi.mocked(loadCollection)

const petsFixture: DataCollection<Pet> = {
  updatedAt: '2026-04-18T00:00:00.000Z',
  items: [
    {
      id: 'pet-clockwork-cat',
      name: { original: 'Clockwork Cat', display: '发条小猫' },
      description: { original: 'A reliable gem-shop companion.', display: '一只稳定的宝石商店伙伴。' },
      isAvailable: true,
      iconGraphicId: '101',
      illustrationGraphicId: '201',
      acquisition: {
        kind: 'gems',
        sourceType: 'shop',
        gemCost: 50000,
        premiumPackName: null,
        premiumPackDescription: null,
        patronName: null,
        patronCurrency: null,
        patronCost: null,
        patronInfluence: null,
      },
      icon: { path: 'v1/pets/icons/clockwork-cat.png', width: 128, height: 128, bytes: 1024, format: 'png' },
      illustration: {
        path: 'v1/pets/illustrations/clockwork-cat.png',
        width: 512,
        height: 512,
        bytes: 4096,
        format: 'png',
      },
    },
    {
      id: 'pet-arcane-owl',
      name: { original: 'Arcane Owl', display: '秘法猫头鹰' },
      description: { original: 'A premium familiar with missing XL art.', display: '一只付费宠物，目前缺少 XL 立绘。' },
      isAvailable: true,
      iconGraphicId: '102',
      illustrationGraphicId: null,
      acquisition: {
        kind: 'premium',
        sourceType: 'dlc',
        gemCost: null,
        premiumPackName: { original: 'Arcane Owl DLC', display: '秘法猫头鹰 DLC' },
        premiumPackDescription: null,
        patronName: null,
        patronCurrency: null,
        patronCost: null,
        patronInfluence: null,
      },
      icon: { path: 'v1/pets/icons/arcane-owl.png', width: 128, height: 128, bytes: 1024, format: 'png' },
      illustration: null,
    },
  ],
}

function renderPetsPage() {
  return render(
    <I18nProvider>
      <PetsPage />
    </I18nProvider>,
  )
}

describe('PetsPage filters', () => {
  beforeEach(() => {
    mockedLoadCollection.mockImplementation(async (name) => {
      if (name === 'pets') {
        return petsFixture
      }

      throw new Error(`unexpected collection: ${name}`)
    })
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    vi.restoreAllMocks()
  })

  it('使用左侧筛选栏控制宠物结果', async () => {
    const user = userEvent.setup()

    renderPetsPage()

    expect(await screen.findByRole('heading', { level: 3, name: '筛选条件' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: /^搜索/ })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /^来源/ })).toBeInTheDocument()

    const initialResults = await screen.findByLabelText('宠物结果')
    expect(within(initialResults).getByText('发条小猫')).toBeInTheDocument()
    expect(within(initialResults).getByText('秘法猫头鹰')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /^来源/ }), 'premium')

    await waitFor(() => {
      expect(screen.queryByText('发条小猫')).not.toBeInTheDocument()
    })
    expect(screen.getByText('秘法猫头鹰')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '缺图像' }))
    expect(screen.getByText('秘法猫头鹰')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清空全部' }))

    await waitFor(() => {
      expect(screen.getByText('发条小猫')).toBeInTheDocument()
      expect(screen.getByText('秘法猫头鹰')).toBeInTheDocument()
    })
  })
})
