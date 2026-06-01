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

function formatProfileSourceLabel(source: UserProfileSourceKind) {
  return source === 'browser-sync' ? '浏览器同步快照' : '本地开发快照'
}

export function LocalDevSnapshotSection({
  canLoadLocalDevSnapshot,
  profileResolution,
  selectedProfileSource,
  localDevRefreshState,
  onSelectBrowserSnapshot,
  onSelectLocalDevSnapshot,
  onRefreshLocalDevSnapshot,
}: LocalDevSnapshotSectionProps) {
  return (
    <div>
      <p>仅本地开发：浏览器同步快照与本地开发快照必须分离。本地开发快照只读使用，不会覆盖浏览器 IndexedDB。</p>
      <p>刷新动作会使用当前机器的私有环境变量抓取官方只读数据，并只写入被忽略的本地快照目录。</p>
      <p>当前开发数据源：{formatProfileSourceLabel(selectedProfileSource)}</p>

      {profileResolution.snapshot && (
        <p>
          当前选中源拥有英雄 {profileResolution.snapshot.ownedHeroes.length} 个；已导入阵型 {profileResolution.snapshot.importedFormationSaves.length} 个。
        </p>
      )}

      {profileResolution.errorMessage && (
        <p role="alert">{profileResolution.errorMessage}</p>
      )}

      {localDevRefreshState.status === 'loading' && (
        <p role="status">正在刷新本地开发快照…</p>
      )}

      {localDevRefreshState.status === 'success' && (
        <p role="status">{localDevRefreshState.message}</p>
      )}

      {localDevRefreshState.status === 'error' && (
        <p role="alert">{localDevRefreshState.message}</p>
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
        onClick={onRefreshLocalDevSnapshot}
        disabled={!canLoadLocalDevSnapshot || localDevRefreshState.status === 'loading'}
      >
        刷新本地开发快照
      </button>
    </div>
  )
}
