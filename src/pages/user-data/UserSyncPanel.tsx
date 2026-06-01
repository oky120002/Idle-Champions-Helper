import type { UserCredentials } from '../../domain/types'
import { LocalDevSnapshotSection } from './LocalDevSnapshotSection'
import { useUserSyncModel } from './useUserSyncModel'

type UserSyncPanelProps = {
  credentials?: UserCredentials | null
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
    localDevRefreshState,
    handleSync,
    handleSelectLocalDevSnapshot,
    handleSelectProfileSource,
    handleRefreshLocalDevSnapshot,
    handleDelete,
  } = useUserSyncModel(credentials)

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

      {showLocalDevSnapshotAction && (
        <LocalDevSnapshotSection
          canLoadLocalDevSnapshot={canLoadLocalDevSnapshot}
          profileResolution={profileResolution}
          selectedProfileSource={selectedProfileSource}
          localDevRefreshState={localDevRefreshState}
          onSelectBrowserSnapshot={() => handleSelectProfileSource('browser-sync')}
          onSelectLocalDevSnapshot={handleSelectLocalDevSnapshot}
          onRefreshLocalDevSnapshot={() => void handleRefreshLocalDevSnapshot()}
        />
      )}
    </section>
  )
}
