import { describe, expect, it } from 'vitest'
import { filterChampionCardAttributeGroups, getChampionCardVisibleAttributeGroupIds } from '../../../src/pages/champions/champion-card-model'

describe('champion card model', () => {
  it('默认展示英雄卡里全部可筛标签组', () => {
    expect(
      getChampionCardVisibleAttributeGroupIds({
        selectedAcquisitions: [],
        selectedMechanics: [],
      }),
    ).toEqual(['race', 'alignment', 'profession', 'gender', 'acquisition', 'mechanics'])
  })

  it('结果卡会过滤掉不在卡片展示清单里的标签组', () => {
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
          selectedAcquisitions: [],
          selectedMechanics: [],
        },
      ).map((group) => group.id),
    ).toEqual(['race', 'alignment', 'profession', 'gender', 'acquisition', 'mechanics'])
  })
})
