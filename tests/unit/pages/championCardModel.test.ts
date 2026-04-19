import { describe, expect, it } from 'vitest'
import { filterChampionCardAttributeGroups, getChampionCardVisibleAttributeGroupIds } from '../../../src/pages/champions/champion-card-model'

describe('champion card model', () => {
  it('默认只保留基础身份标签组', () => {
    expect(
      getChampionCardVisibleAttributeGroupIds({
        selectedAcquisitions: [],
        selectedMechanics: [],
      }),
    ).toEqual(['race', 'alignment', 'profession', 'gender'])
  })

  it('仅在对应筛选启用时追加获取方式和特殊机制', () => {
    expect(
      filterChampionCardAttributeGroups(
        [
          { id: 'race', tags: ['human'] },
          { id: 'alignment', tags: ['lawful_good'] },
          { id: 'profession', tags: ['wizard'] },
          { id: 'gender', tags: ['female'] },
          { id: 'acquisition', tags: ['event'] },
          { id: 'mechanics', tags: ['gold_find'] },
          { id: 'other', tags: ['nerds'] },
        ],
        {
          selectedAcquisitions: ['event'],
          selectedMechanics: ['gold_find'],
        },
      ).map((group) => group.id),
    ).toEqual(['race', 'alignment', 'profession', 'gender', 'acquisition', 'mechanics'])
  })
})
