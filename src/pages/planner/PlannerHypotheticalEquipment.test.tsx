import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { PlannerHypotheticalEquipment } from './PlannerHypotheticalEquipment'

describe('PlannerHypotheticalEquipment', () => {
  it('渲染当前稀有度与附魔等级', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerHypotheticalEquipment rarity={3} enchant={1500} legendaryLevel={5} onRarityChange={() => {}} onEnchantChange={() => {}} onLegendaryLevelChange={() => {}} />
      </I18nProvider>,
    )
    const rarity = container.querySelector('[data-testid="planner-hypothetical-equipment-rarity"]') as HTMLSelectElement
    const enchant = container.querySelector('[data-testid="planner-hypothetical-equipment-enchant"]') as HTMLInputElement
    expect(rarity.value).toBe('3')
    expect(enchant.value).toBe('1500')
  })

  it('切换稀有度 → onRarityChange', async () => {
    const user = userEvent.setup()
    const onRarityChange = vi.fn()
    const { container } = render(
      <I18nProvider>
        <PlannerHypotheticalEquipment rarity={4} enchant={2000} legendaryLevel={5} onRarityChange={onRarityChange} onEnchantChange={() => {}} onLegendaryLevelChange={() => {}} />
      </I18nProvider>,
    )
    const rarity = container.querySelector('[data-testid="planner-hypothetical-equipment-rarity"]') as HTMLSelectElement
    await user.selectOptions(rarity, '2')
    expect(onRarityChange).toHaveBeenLastCalledWith(2)
  })

  it('输入有效附魔等级 → onEnchantChange', async () => {
    const user = userEvent.setup()
    const onEnchantChange = vi.fn()
    const { container } = render(
      <I18nProvider>
        <PlannerHypotheticalEquipment rarity={4} enchant={2000} legendaryLevel={5} onRarityChange={() => {}} onEnchantChange={onEnchantChange} onLegendaryLevelChange={() => {}} />
      </I18nProvider>,
    )
    const enchant = container.querySelector('[data-testid="planner-hypothetical-equipment-enchant"]') as HTMLInputElement
    await user.clear(enchant)
    await user.type(enchant, '1500')
    expect(onEnchantChange).toHaveBeenLastCalledWith(1500)
  })
})
