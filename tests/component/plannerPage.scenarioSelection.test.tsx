import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../src/app/i18n'
import type { Variant } from '../../src/domain/types'
import { PlannerScenarioSelection } from '../../src/pages/planner/PlannerScenarioSelection'

function text(original: string, display = original) {
  return { original, display }
}

function option(id: string, original: string, display = original) {
  return { id, original, display }
}

function createVariant(id: string, overrides: Partial<Variant> & Pick<Variant, 'campaign' | 'name'>): Variant {
  return {
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
  }
}

const campaignA = option('campaign-a', 'Grand Tour', '剑湾之旅')
const campaignB = option('campaign-b', 'Icewind Dale', '冰风谷')

const variants: Variant[] = [
  createVariant('1', {
    campaign: campaignA,
    name: text('Archer Barrage', '弓兵压制'),
    adventureId: 'adventure-1',
    adventure: text('Catacombs', '墓穴深处'),
    objectiveArea: 125,
    restrictions: [
      text('Keep archers contained', '压住弓兵波次'),
    ],
    enemyTypes: ['undead'],
    attackMix: { melee: 1, ranged: 4, magic: 0, other: 0 },
    specialEnemyCount: 11,
  }),
  createVariant('2', {
    campaign: campaignB,
    name: text('Frozen Push', '冰原推进'),
    adventureId: 'adventure-2',
    adventure: text('Frost Gate', '霜门关卡'),
    objectiveArea: 175,
    restrictions: [
      text('Dragons ahead', '前方有龙类敌人'),
      text(
        'All champions must survive until area 500 while dealing with increasingly powerful dragon breath attacks that scale with area number',
        '所有英雄必须在 500 区之前存活，同时应对随区域编号增强的龙息攻击',
      ),
    ],
    enemyTypes: ['dragon'],
    attackMix: { melee: 2, ranged: 1, magic: 2, other: 0 },
    specialEnemyCount: 14,
  }),
  createVariant('3', {
    campaign: campaignA,
    name: text('Silent Night', '寂静之夜'),
    adventureId: 'adventure-1',
    adventure: text('Catacombs', '墓穴深处'),
    objectiveArea: 200,
    restrictions: [],
    enemyTypes: ['undead'],
    attackMix: { melee: 3, ranged: 0, magic: 1, other: 0 },
    specialEnemyCount: 8,
  }),
]

function renderScenarioSelection(overrides: { variants?: Variant[] } = {}) {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <PlannerScenarioSelection variants={overrides.variants ?? variants} />
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('PlannerScenarioSelection', () => {
  it('variant 列表可按文本筛选', async () => {
    const user = userEvent.setup()
    renderScenarioSelection()

    // All three variants are visible initially
    expect(screen.getByText('弓兵压制')).toBeInTheDocument()
    expect(screen.getByText('冰原推进')).toBeInTheDocument()
    expect(screen.getByText('寂静之夜')).toBeInTheDocument()

    // Type a filter that matches only one variant
    const searchbox = screen.getByRole('searchbox')
    await user.type(searchbox, '弓兵')

    expect(screen.getByText('弓兵压制')).toBeInTheDocument()
    expect(screen.queryByText('冰原推进')).not.toBeInTheDocument()
    expect(screen.queryByText('寂静之夜')).not.toBeInTheDocument()
  })

  it('选择 variant 后显示阵型和限制摘要', async () => {
    const user = userEvent.setup()
    renderScenarioSelection()

    // Click the second variant (Frozen Push)
    await user.click(screen.getByRole('button', { name: /冰原推进/ }))

    // Formation summary should show objective area in the detail panel
    const detailPanel = screen.getByLabelText('选中场景详情')
    expect(within(detailPanel).getByText(/目标区域：175/)).toBeInTheDocument()

    // Restrictions should be visible in the detail panel
    expect(within(detailPanel).getByText('前方有龙类敌人')).toBeInTheDocument()
  })

  it('长限制文本仍以文本形式可访问', async () => {
    const user = userEvent.setup()
    renderScenarioSelection()

    // Select the variant with long restriction
    await user.click(screen.getByRole('button', { name: /冰原推进/ }))

    // Long restriction text should be present as plain text in the DOM
    const detailPanel = screen.getByLabelText('选中场景详情')
    const longText = '所有英雄必须在 500 区之前存活，同时应对随区域编号增强的龙息攻击'
    expect(within(detailPanel).getByText(new RegExp(longText))).toBeInTheDocument()

    // Verify it is a text node, not image-only
    const textElement = within(detailPanel).getByText(new RegExp(longText))
    expect(textElement.tagName).not.toBe('IMG')
    expect(textElement.textContent).toContain(longText)
  })
})
