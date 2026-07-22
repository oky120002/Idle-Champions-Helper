import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { PlannerScenarioSelection } from './PlannerScenarioSelection'
import type { LocalizedOption, LocalizedText, Variant } from '../../domain/types'

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

function createVariant(
  id: string,
  overrides: Partial<Variant> & Pick<Variant, 'campaign' | 'name'>,
): Variant {
  const variant: Variant = {
    id,
    campaign: overrides.campaign,
    name: overrides.name,
    adventureId: overrides.adventureId ?? null,
    adventure: overrides.adventure ?? null,
    objectiveArea: overrides.objectiveArea ?? null,
    locationId: overrides.locationId ?? null,
    areaSetId: overrides.areaSetId ?? null,
    scene: overrides.scene ?? null,
    restrictions: overrides.restrictions ?? [],
    rewards: overrides.rewards ?? [],
    enemyCount: overrides.enemyCount ?? 0,
    enemyTypes: overrides.enemyTypes ?? [],
    attackMix: overrides.attackMix ?? { melee: 0, ranged: 0, magic: 0, other: 0 },
    specialEnemyCount: overrides.specialEnemyCount ?? 0,
    escortCount: overrides.escortCount ?? 0,
    areaHighlights: overrides.areaHighlights ?? [],
    areaMilestones: overrides.areaMilestones ?? [],
    mechanics: overrides.mechanics ?? [],
    forcedHeroIds: overrides.forcedHeroIds ?? [],
    allowedHeroIds: overrides.allowedHeroIds ?? [],
    allowedTags: overrides.allowedTags ?? [],
  }

  if (overrides.enemyTypeCounts !== undefined) {
    variant.enemyTypeCounts = overrides.enemyTypeCounts
  }

  return variant
}

function renderScenarioSelection(variants: Variant[], selectedId?: string) {
  return render(
    <I18nProvider>
      <PlannerScenarioSelection
        variants={variants}
        {...(selectedId !== undefined ? { selectedId } : {})}
      />
    </I18nProvider>,
  )
}

describe('PlannerScenarioSelection', () => {
  it('支持按多个关键词跨名称、战役、目标区和限制条件组合搜索', async () => {
    const variants = [
      createVariant('variant-1', {
        campaign: option('campaign-a', 'Grand Tour', '剑湾之旅'),
        name: text('Archer Barrage', '弓兵压制'),
        objectiveArea: 150,
        restrictions: [text('Only ranged champions', '仅允许远程英雄')],
      }),
      createVariant('variant-2', {
        campaign: option('campaign-b', 'Harvestide', '丰收节'),
        name: text('Toxic Curse', '传染性诅咒'),
        objectiveArea: 150,
        restrictions: [text('Escort the cursed villager', '护送被诅咒的村民')],
      }),
      createVariant('variant-3', {
        campaign: option('campaign-b', 'Harvestide', '丰收节'),
        name: text('Wild Necromancer', '肆意妄为的死灵法师'),
        objectiveArea: 175,
        restrictions: [text('Only evil champions', '仅允许邪恶阵营')],
      }),
    ]

    renderScenarioSelection(variants, 'variant-1')

    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox', { name: '搜索场景' }), '丰收节 150 村民')

    const listbox = screen.getByRole('listbox', { name: '场景列表' })
    const buttons = within(listbox).getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveTextContent('传染性诅咒')
    expect(buttons[0]).toHaveTextContent('丰收节')
  })

  it('默认精简显示结果，并允许显式展开全部匹配项', async () => {
    const variants = Array.from({ length: 13 }, (_, index) => createVariant(`variant-${index + 1}`, {
      campaign: option('campaign-a', 'Grand Tour', '剑湾之旅'),
      name: text(`Variant ${index + 1}`, `关卡 ${index + 1}`),
      objectiveArea: 75 + index,
    }))

    renderScenarioSelection(variants, 'variant-1')

    const listbox = screen.getByRole('listbox', { name: '场景列表' })
    expect(within(listbox).getAllByRole('button')).toHaveLength(12)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '展开全部匹配项' }))

    expect(within(listbox).getAllByRole('button')).toHaveLength(13)
    expect(screen.getByRole('button', { name: '收起到精简视图' })).toBeInTheDocument()
  })
})
