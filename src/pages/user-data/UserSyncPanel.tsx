import type { UserCredentials } from '../../domain/types'
import { useUserSyncModel } from './useUserSyncModel'

type UserSyncPanelProps = {
  credentials?: UserCredentials | null
}

function formatProfileSourceLabel(source: 'browser-sync' | 'local-dev-snapshot') {
  return source === 'browser-sync' ? '浏览器同步快照' : '本地开发快照'
}

export function UserSyncPanel({ credentials = null }: UserSyncPanelProps) {
  const {
    syncState,
    busy,
    canSync,
    canLoadLocalDevSnapshot,
    showLocalDevSnapshotAction,
    profileResolution,
    selectedProfileSource,
    handleSync,
    handleSelectLocalDevSnapshot,
    handleSelectProfileSource,
    handleDelete,
  } = useUserSyncModel(credentials)
  const showLocalDevSnapshotSection = import.meta.env.DEV && showLocalDevSnapshotAction

  return (
    <section aria-label="同步状态" role="region">
      {syncState.status === 'no-snapshot' && (
        <p>浏览器内尚未保存同步快照。先读取并校验凭证，然后手动同步。</p>
      )}

      {syncState.status === 'loaded' && (
        <div>
          <p>
            浏览器同步快照已于 {syncState.ageDays} 天前更新。
          </p>
          <p>
            拥有英雄 {syncState.snapshot.ownedHeroes.length} 个；已导入阵型 {syncState.snapshot.importedFormationSaves.length} 个；同步警告 {syncState.snapshot.warnings.length} 条。
          </p>
        </div>
      )}

      {syncState.status === 'error' && (
        <p role="alert">{syncState.message}</p>
      )}

      <div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={!canSync}
        >
          手动同步
        </button>

        {syncState.status !== 'no-snapshot' && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy}
          >
            删除
          </button>
        )}
      </div>

      {showLocalDevSnapshotSection && (
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
              onClick={() => handleSelectProfileSource('browser-sync')}
              aria-pressed={selectedProfileSource === 'browser-sync'}
            >
              使用浏览器快照
            </button>

            <button
              type="button"
              onClick={() => handleSelectLocalDevSnapshot()}
              disabled={!canLoadLocalDevSnapshot}
              aria-pressed={selectedProfileSource === 'local-dev-snapshot'}
            >
              使用本地开发快照
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSelectLocalDevSnapshot()}
            disabled={!canLoadLocalDevSnapshot}
          >
            刷新本地开发快照
          </button>
        </div>
      )}
    </section>
  )
}
