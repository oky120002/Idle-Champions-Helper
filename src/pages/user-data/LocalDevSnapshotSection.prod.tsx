import type {
  UserProfileResolution,
  UserProfileSourceKind,
} from '../../data/user-profile-store'
import type { LocalDevRefreshState } from './useUserSyncModel'

type LocalDevSnapshotSectionProps = {
  canLoadLocalDevSnapshot: boolean
  profileResolution: UserProfileResolution
  selectedProfileSource: UserProfileSourceKind
  localDevRefreshState: LocalDevRefreshState
  onSelectBrowserSnapshot: () => void
  onSelectLocalDevSnapshot: () => void
  onRefreshLocalDevSnapshot: () => void
}

export function LocalDevSnapshotSection(_props: LocalDevSnapshotSectionProps) {
  return null
}
