import type { UserProfileResolution } from '../../data/user-profile-store'
import type { ChampionsPageModel } from '../champions/types'
import type { ChampionRosterSeatColumn, ChampionRosterSummary } from '../champions/championRoster'

export interface UserHeroesPageModel extends ChampionsPageModel {
  profileResolution: UserProfileResolution | null
  rosterSeatColumns: ChampionRosterSeatColumn[]
  rosterSummary: ChampionRosterSummary | null
}
