import { describe, expect, it } from 'vitest'
import {
  appendCommonFilterSearchParams,
  readCommonFilterExpansion,
  readCommonFilterState,
  type CommonFilterSearchParamKeys,
  type CommonFilterSearchState,
} from '../../../src/features/champion-filters/query-state'

const FILTER_PARAM_KEYS: CommonFilterSearchParamKeys = {
  query: 'q',
  seat: 'seat',
  role: 'role',
  affiliation: 'affiliation',
  race: 'race',
  gender: 'gender',
  alignment: 'alignment',
  profession: 'profession',
  acquisition: 'acquisition',
  mechanic: 'mechanic',
}

describe('champion filter query-state helpers', () => {
  it('build common params 时会裁剪搜索词，并对多值维度做稳定排序', () => {
    const filters: CommonFilterSearchState = {
      search: '  briv  ',
      selectedSeats: [10, 2, 1],
      selectedRoles: ['support', 'dps'],
      selectedAffiliations: ['B', 'A'],
      selectedRaces: ['human', 'elf'],
      selectedGenders: ['female', 'male'],
      selectedAlignments: ['good'],
      selectedProfessions: ['wizard', 'bard'],
      selectedAcquisitions: ['event'],
      selectedMechanics: ['spec_gold', 'control_stun'],
    }

    const searchParams = appendCommonFilterSearchParams(new URLSearchParams(), filters, FILTER_PARAM_KEYS)

    expect(searchParams.toString()).toBe(
      'q=briv&seat=1&seat=2&seat=10&role=dps&role=support&affiliation=A&affiliation=B&race=elf&race=human&gender=female&gender=male&alignment=good&profession=bard&profession=wizard&acquisition=event&mechanic=control_stun&mechanic=spec_gold',
    )
  })

  it('read helpers 会恢复公共筛选状态并识别身份/元信息分组展开', () => {
    const searchParams = new URLSearchParams(
      'q=celeste&seat=2&role=healing&affiliation=Companions+of+the+Hall&race=human&gender=female&alignment=good&profession=cleric&acquisition=event&mechanic=spec_gold',
    )

    expect(readCommonFilterState(searchParams, FILTER_PARAM_KEYS)).toEqual({
      search: 'celeste',
      selectedSeats: [2],
      selectedRoles: ['healing'],
      selectedAffiliations: ['Companions of the Hall'],
      selectedRaces: ['human'],
      selectedGenders: ['female'],
      selectedAlignments: ['good'],
      selectedProfessions: ['cleric'],
      selectedAcquisitions: ['event'],
      selectedMechanics: ['spec_gold'],
    })
    expect(readCommonFilterExpansion(searchParams, FILTER_PARAM_KEYS)).toEqual({
      identity: true,
      meta: true,
    })
  })
})
