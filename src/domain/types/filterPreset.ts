import type { CommonFilterSearchState } from '../../features/champion-filters/query-state'

export interface ChampionFilterPreset {
  id: string
  schemaVersion: 1
  name: string
  filters: CommonFilterSearchState
  createdAt: string
  updatedAt: string
}
