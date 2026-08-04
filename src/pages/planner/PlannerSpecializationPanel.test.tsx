import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { Champion } from '../../domain/types'
import type { SpecializationCatalog, SpecializationEntry } from '../../domain/abilities/specializationSignals'
import { createOwnedHero } from '../../domain/user-profile/fixtures'
import { queryOrFail } from '../../../tests/utils/dom-assertions'
import { PlannerSpecializationPanel } from './PlannerSpecializationPanel'
import type { SpecializationOverrideMap } from './specializationSelection'

function makeEntry(upgradeId: string, requiredLevel: number | null, display: string): SpecializationEntry {
  return {
    upgradeId,
    requiredLevel,
    specializationName: { original: display, display },
    signals: [{
      dimension: 'damage',
      bucket: 'carrySignals',
      signal: { kind: 'heroDpsMultiplier', value: 40, rawEffect: 'hero_dps_multiplier_mult,40', source: 'official-parsed' },
    }],
  }
}

const champion7 = { id: '7', name: { display: '明斯克', original: 'Minsc' } } as unknown as Champion
const champion88 = { id: '88', name: { display: '阿什贝瑞', original: 'Asharra' } } as unknown as Champion
const championById = new Map([
  ['7', champion7],
  ['88', champion88],
])

const catalog: SpecializationCatalog = {
  '7': [
    makeEntry('108', 50, '偏好敌人：类人生物'),
    makeEntry('109', 50, '偏好敌人：兽类'),
    makeEntry('110', 50, '偏好敌人：亡灵'),
  ],
  '88': [
    makeEntry('6838', 20, '高强度'),
    makeEntry('6839', 20, '低强度'),
    makeEntry('6840', 50, '高敏捷度'),
    makeEntry('6841', 50, '低敏捷度'),
  ],
}

function renderPanel({
  ownedHeroes,
  overrides = {},
  onSetOverride = vi.fn(),
  onClearOverride = vi.fn(),
}: {
  ownedHeroes: ReturnType<typeof createOwnedHero>[]
  overrides?: SpecializationOverrideMap
  onSetOverride?: (heroId: string, upgradeIds: string[]) => void
  onClearOverride?: (heroId: string) => void
}) {
  const user = userEvent.setup()
  const result = render(
    <I18nProvider>
      <PlannerSpecializationPanel
        ownedHeroes={ownedHeroes}
        catalog={catalog}
        overrides={overrides}
        championById={championById}
        onSetOverride={onSetOverride}
        onClearOverride={onClearOverride}
      />
    </I18nProvider>,
  )
  // 默认收起；用 DOM 查询（container.querySelector）命中折叠内的 radio，不受 a11y hidden 过滤。
  return { ...result, user, onSetOverride, onClearOverride }
}

describe('PlannerSpecializationPanel', () => {
  it('无专精英雄在已拥有列表中 → 不渲染面板', () => {
    const { container } = renderPanel({ ownedHeroes: [createOwnedHero({ heroId: '999' })] })
    expect(container.querySelector('[data-testid="planner-specialization-panel"]')).toBeNull()
  })

  it('渲染有专精的英雄、分层 legend 与选项', () => {
    const { container } = renderPanel({
      ownedHeroes: [createOwnedHero({ heroId: '7' }), createOwnedHero({ heroId: '88' })],
    })
    expect(container.querySelector('[data-hero-id="7"]')?.textContent).toContain('明斯克')
    expect(container.querySelector('[data-hero-id="88"]')?.textContent).toContain('阿什贝瑞')
    // hero 7 单层（解锁等级 50），hero 88 两层（20 / 50）
    const row88 = container.querySelector('[data-hero-id="88"]')
    expect(row88?.textContent).toContain('解锁等级 20')
    expect(row88?.textContent).toContain('解锁等级 50')
    // 无选项存在
    expect(row88?.querySelector('[data-spec-option="none"]')).not.toBeNull()
  })

  it('存档已选专精 → 对应 radio 选中', () => {
    const { container } = renderPanel({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: ['109'] })],
    })
    expect(container.querySelector('[data-spec-option="109"]')).toHaveProperty('checked', true)
    expect(container.querySelector('[data-spec-option="none"]')).toHaveProperty('checked', false)
  })

  it('点击选项 → onSetOverride 收到单层数组', async () => {
    const onSetOverride = vi.fn()
    const { container, user } = renderPanel({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: [] })],
      onSetOverride,
    })
    await user.click(queryOrFail(container, '[data-spec-option="109"]'))
    expect(onSetOverride).toHaveBeenCalledWith('7', ['109'])
  })

  it('点击「无」→ onSetOverride 收到空数组（显式清除本层）', async () => {
    const onSetOverride = vi.fn()
    const { container, user } = renderPanel({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: ['109'] })],
      onSetOverride,
    })
    await user.click(queryOrFail(container, '[data-spec-option="none"]'))
    expect(onSetOverride).toHaveBeenCalledWith('7', [])
  })

  it('多层英雄：层间选择互不干扰，合并进同一 override 数组', async () => {
    const onSetOverride = vi.fn()
    const { container, user } = renderPanel({
      ownedHeroes: [createOwnedHero({ heroId: '88', specializations: [] })],
      overrides: { '88': ['6838'] }, // 组件受控：模拟 hook 已写入第一层选择
      onSetOverride,
    })
    // 选第二层（解锁等级 50）的 6840：应保留第一层 6838
    await user.click(queryOrFail(container, '[data-spec-option="6840"]'))
    expect(onSetOverride).toHaveBeenLastCalledWith('88', ['6838', '6840'])
  })

  it('override 存在时显示「恢复存档」，点击 → onClearOverride', async () => {
    const onClearOverride = vi.fn()
    const { container, user } = renderPanel({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: ['109'] })],
      overrides: { '7': ['110'] },
      onClearOverride,
    })
    const resetBtn = container.querySelector('[data-reset-hero="7"]')
    expect(resetBtn).not.toBeNull()
    await user.click(queryOrFail(container, '[data-reset-hero="7"]'))
    expect(onClearOverride).toHaveBeenCalledWith('7')
  })

  it('未 override 时不显示「恢复存档」', () => {
    const { container } = renderPanel({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: ['109'] })],
    })
    expect(container.querySelector('[data-reset-hero="7"]')).toBeNull()
  })
})
