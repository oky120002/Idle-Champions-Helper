import type { UserCredentials } from '../../domain/types'
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
    handleSync,
    handleLoadLocalDevSnapshot,
    handleDelete,
  } = useUserSyncModel(credentials)
  const showLocalDevSnapshotSection = import.meta.env.DEV && showLocalDevSnapshotAction

  return (
    <section aria-label="同步状态" role="region">
      {syncState.status === 'no-snapshot' && (
        <p>尚未保存本地用户快照。先读取并校验凭证，然后手动同步。</p>
      )}

      {syncState.status === 'loaded' && (
        <div>
          <p>
            本地数据已于 {syncState.ageDays} 天前更新。
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
          <p>仅本地开发：可将本机准备好的私有快照导入当前浏览器。</p>
          <button
            type="button"
            onClick={() => void handleLoadLocalDevSnapshot()}
            disabled={!canLoadLocalDevSnapshot}
          >
            导入本地开发快照
          </button>
        </div>
      )}
    </section>
  )
}
