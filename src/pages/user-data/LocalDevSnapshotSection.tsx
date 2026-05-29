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

function formatProfileSourceLabel(source: UserProfileSourceKind) {
  return source === 'browser-sync' ? '浏览器同步快照' : '本地开发快照'
}

export function LocalDevSnapshotSection({
  canLoadLocalDevSnapshot,
  profileResolution,
  selectedProfileSource,
  onSelectBrowserSnapshot,
  onSelectLocalDevSnapshot,
}: LocalDevSnapshotSectionProps) {
  return (
    <div>
      <p>仅本地开发：浏览器同步快照与本地开发快照必须分离。本地开发快照只读使用，不会覆盖浏览器 IndexedDB。</p>
      <p>当前开发数据源：{formatProfileSourceLabel(selectedProfileSource)}</p>

      {profileResolution.snapshot && (
        <p>
          当前选中源拥有英雄 {profileResolution.snapshot.ownedHeroes.length} 个；已导入阵型 {profileResolution.snapshot.importedFormationSaves.length} 个。
        </p>
      )}

      {profileResolution.errorMessage && (
        <p role="alert">{profileResolution.errorMessage}</p>
      )}

      <div aria-label="开发数据源" role="group">
        <button
          type="button"
          onClick={onSelectBrowserSnapshot}
          aria-pressed={selectedProfileSource === 'browser-sync'}
        >
          使用浏览器快照
        </button>

        <button
          type="button"
          onClick={onSelectLocalDevSnapshot}
          disabled={!canLoadLocalDevSnapshot}
          aria-pressed={selectedProfileSource === 'local-dev-snapshot'}
        >
          使用本地开发快照
        </button>
      </div>

      <button
        type="button"
        onClick={onSelectLocalDevSnapshot}
        disabled={!canLoadLocalDevSnapshot}
      >
        刷新本地开发快照
      </button>
    </div>
  )
}
