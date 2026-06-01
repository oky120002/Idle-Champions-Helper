import type { UserProfileResolution } from '../../data/user-profile-store'
import type { ChampionsPageModel } from '../champions/types'
import type { ChampionRosterSeatColumn, ChampionRosterSummary } from '../champions/championRoster'

export type UserHeroesRosterMetricFilterId =
  | 'owned'
  | 'epic-slots'
  | 'shiny-slots'
  | 'golden-slots'
  | 'legendary-slots'

export interface UserHeroesPageModel extends ChampionsPageModel {
  profileResolution: UserProfileResolution | null
  rosterSeatColumns: ChampionRosterSeatColumn[]
  rosterSummary: ChampionRosterSummary | null
  activeRosterMetricFilterId: UserHeroesRosterMetricFilterId | null
  toggleRosterMetricFilter: (id: UserHeroesRosterMetricFilterId) => void
}
