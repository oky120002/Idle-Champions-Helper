import type { ChampionMechanicCategoryId } from '../../domain/championTags'
import type { Champion, LocalizedText } from '../../domain/types'

export type AttributeFilterGroupId =
  | 'race'
  | 'gender'
  | 'alignment'
  | 'profession'
  | 'acquisition'
  | 'mechanics'

export interface StringEnumGroup {
  id: string
  values: string[]
}

export interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

export interface MechanicOptionGroup {
  id: ChampionMechanicCategoryId
  options: string[]
}

export interface ActiveFilterChip {
  id: string
  label: string
  clearLabel: string
}

export interface ChampionFilterOptionData {
  champions: Champion[]
  roles: string[]
  affiliations: LocalizedText[]
}
