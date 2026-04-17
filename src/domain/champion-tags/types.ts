export type ChampionAttributeGroupId =
  | 'race'
  | 'gender'
  | 'alignment'
  | 'profession'
  | 'acquisition'
  | 'mechanics'
  | 'other'

export interface ChampionAttributeGroup {
  id: ChampionAttributeGroupId
  tags: string[]
}

export type ChampionMechanicCategoryId = 'positional' | 'control' | 'specialization'
