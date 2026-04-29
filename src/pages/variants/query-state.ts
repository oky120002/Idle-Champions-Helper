import { ALL_CAMPAIGNS } from './constants'
import type {
  AttackProfileFilterId,
  SpecialEnemyFilterId,
  VariantDetailTabId,
  VariantsFilterState,
} from './types'

const SEARCH_PARAM_QUERY = 'q'
const SEARCH_PARAM_CAMPAIGN = 'campaign'
const SEARCH_PARAM_ADVENTURE = 'adventure'
const SEARCH_PARAM_SCENE = 'scene'
const SEARCH_PARAM_ENEMY = 'enemy'
const SEARCH_PARAM_ATTACK = 'attack'
const SEARCH_PARAM_SPECIAL = 'special'
const SEARCH_PARAM_AREA = 'area'
const SEARCH_PARAM_VIEW = 'view'
const SEARCH_PARAM_TAB = 'tab'
const RESULTS_VIEW_ALL = 'all'

function readAttackProfile(searchParams: URLSearchParams): AttackProfileFilterId {
  const attackProfile = searchParams.get(SEARCH_PARAM_ATTACK)

  if (attackProfile === 'meleeHeavy' || attackProfile === 'rangedThreat' || attackProfile === 'mixed') {
    return attackProfile
  }

  return '__all__'
}

function readSpecialEnemyRange(searchParams: URLSearchParams): SpecialEnemyFilterId {
  const specialEnemyRange = searchParams.get(SEARCH_PARAM_SPECIAL)

  if (specialEnemyRange === 'light' || specialEnemyRange === 'standard' || specialEnemyRange === 'dense') {
    return specialEnemyRange
  }

  return '__all__'
}

function readDetailTab(searchParams: URLSearchParams): VariantDetailTabId {
  const tab = searchParams.get(SEARCH_PARAM_TAB)

  if (tab === 'areas' || tab === 'story') {
    return tab
  }

  return 'variants'
}

export function readInitialVariantsFilterState(search: string): VariantsFilterState {
  const searchParams = new URLSearchParams(search)

  return {
    search: searchParams.get(SEARCH_PARAM_QUERY) ?? '',
    selectedCampaign: searchParams.get(SEARCH_PARAM_CAMPAIGN) ?? ALL_CAMPAIGNS,
    selectedAdventureId: searchParams.get(SEARCH_PARAM_ADVENTURE) ?? '',
    selectedSceneIds: searchParams.getAll(SEARCH_PARAM_SCENE),
    selectedEnemyTypeIds: searchParams.getAll(SEARCH_PARAM_ENEMY),
    selectedAttackProfile: readAttackProfile(searchParams),
    selectedSpecialEnemyRange: readSpecialEnemyRange(searchParams),
    areaSearch: searchParams.get(SEARCH_PARAM_AREA) ?? '',
    showAllResults: searchParams.get(SEARCH_PARAM_VIEW) === RESULTS_VIEW_ALL,
    detailTab: readDetailTab(searchParams),
  }
}

export function buildVariantsFilterSearchParams(filters: VariantsFilterState): URLSearchParams {
  const searchParams = new URLSearchParams()

  if (filters.search.trim().length > 0) {
    searchParams.set(SEARCH_PARAM_QUERY, filters.search.trim())
  }

  if (filters.selectedCampaign !== ALL_CAMPAIGNS) {
    searchParams.set(SEARCH_PARAM_CAMPAIGN, filters.selectedCampaign)
  }

  if (filters.selectedAdventureId.trim().length > 0) {
    searchParams.set(SEARCH_PARAM_ADVENTURE, filters.selectedAdventureId.trim())
  }

  filters.selectedSceneIds.forEach((sceneId) => {
    searchParams.append(SEARCH_PARAM_SCENE, sceneId)
  })

  filters.selectedEnemyTypeIds.forEach((enemyTypeId) => {
    searchParams.append(SEARCH_PARAM_ENEMY, enemyTypeId)
  })

  if (filters.selectedAttackProfile !== '__all__') {
    searchParams.set(SEARCH_PARAM_ATTACK, filters.selectedAttackProfile)
  }

  if (filters.selectedSpecialEnemyRange !== '__all__') {
    searchParams.set(SEARCH_PARAM_SPECIAL, filters.selectedSpecialEnemyRange)
  }

  if (filters.areaSearch.trim().length > 0) {
    searchParams.set(SEARCH_PARAM_AREA, filters.areaSearch.trim())
  }

  if (filters.showAllResults) {
    searchParams.set(SEARCH_PARAM_VIEW, RESULTS_VIEW_ALL)
  }

  if (filters.detailTab !== 'variants') {
    searchParams.set(SEARCH_PARAM_TAB, filters.detailTab)
  }

  return searchParams
}
