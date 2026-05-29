import type {
  UserProfileResolution,
  UserProfileSourceKind,
} from '../../data/user-profile-store'

type LocalDevSnapshotSectionProps = {
  canLoadLocalDevSnapshot: boolean
  profileResolution: UserProfileResolution
  selectedProfileSource: UserProfileSourceKind
  onSelectBrowserSnapshot: () => void
  onSelectLocalDevSnapshot: () => void
}

export function LocalDevSnapshotSection(_props: LocalDevSnapshotSectionProps) {
  return null
}
