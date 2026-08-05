import { describe, expect, it } from 'vitest'
import { unwrap } from '../../tests/utils/dom-assertions'
import { buildScenarioLabelLookup, formatScenarioRefLabel } from './scenarioRefLabel'
import type { Adventure, LocalizedOption, Variant } from './types'
import type { ScenarioLabelLookup } from './scenarioRefLabel'

const variants: Variant[] = [
  {
    id: '80',
    name: { original: 'Cragmaw Ruins', display: '克拉格玛废墟' },
    campaign: { id: '1', original: 'A Grand Tour', display: '剑湾之旅' },
    adventureId: '3',
    adventure: { original: 'Goblin Ambush', display: '哥布林伏击' },
    objectiveArea: null,
    locationId: null,
    areaSetId: null,
    scene: null,
    restrictions: [],
    rewards: [],
  },
] as unknown as Variant[]
const adventures: Adventure[] = [
  { id: '3', name: { original: 'Goblin Ambush', display: '哥布林伏击' } } as Adventure,
]
const campaigns: LocalizedOption[] = [
  { id: '1', original: 'A Grand Tour', display: '剑湾之旅' },
]
const lookup: ScenarioLabelLookup = buildScenarioLabelLookup(variants, adventures, campaigns)

describe('formatScenarioRefLabel', () => {
  it('variant → 变体名 · 冒险名（zh 取 display）', () => {
    expect(formatScenarioRefLabel({ kind: 'variant', id: '80' }, lookup, 'zh-CN')).toBe(
      '克拉格玛废墟 · 哥布林伏击',
    )
  })

  it('variant → en 取 original', () => {
    expect(formatScenarioRefLabel({ kind: 'variant', id: '80' }, lookup, 'en-US')).toBe(
      'Cragmaw Ruins · Goblin Ambush',
    )
  })

  it('variant 缺 adventure → 仅变体名', () => {
    const noAdv = buildScenarioLabelLookup(
      [{ ...unwrap(variants[0], 'variants[0] 应存在'), adventure: null }],
      adventures,
      campaigns,
    )
    expect(formatScenarioRefLabel({ kind: 'variant', id: '80' }, noAdv, 'zh-CN')).toBe('克拉格玛废墟')
  })

  it('adventure → 冒险名', () => {
    expect(formatScenarioRefLabel({ kind: 'adventure', id: '3' }, lookup, 'zh-CN')).toBe('哥布林伏击')
  })

  it('campaign → 战役名', () => {
    expect(formatScenarioRefLabel({ kind: 'campaign', id: '1' }, lookup, 'en-US')).toBe('A Grand Tour')
  })

  it('variant/adventure/campaign 查不到 → 原场景已消失', () => {
    expect(formatScenarioRefLabel({ kind: 'variant', id: '999' }, lookup, 'zh-CN')).toBe('原场景已消失')
    expect(formatScenarioRefLabel({ kind: 'adventure', id: '999' }, lookup, 'en-US')).toBe('Original scenario gone')
  })

  it('trial/timeGate 无名称源 → 回退原始 kind:id', () => {
    expect(formatScenarioRefLabel({ kind: 'trial', id: '5' }, lookup, 'zh-CN')).toBe('trial:5')
    expect(formatScenarioRefLabel({ kind: 'timeGate', id: '12' }, lookup, 'en-US')).toBe('timeGate:12')
  })
})
