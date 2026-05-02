import { useUserSyncModel } from './useUserSyncModel'

export function UserSyncPanel() {
  const { syncState, busy, handleSync, handleSimulateError, handleDelete } = useUserSyncModel()

  return (
    <section aria-label="同步状态" role="region">
      {syncState.status === 'no-snapshot' && (
        <p>尚未保存本地用户快照。</p>
      )}

      {syncState.status === 'loaded' && (
        <p>
          本地数据已于 {syncState.ageDays} 天前更新。
        </p>
      )}

      {syncState.status === 'error' && (
        <p role="alert">{syncState.message}</p>
      )}

      <div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={busy}
        >
          同步
        </button>

        <button
          type="button"
          onClick={handleSimulateError}
          disabled={busy}
        >
          模拟同步失败
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
    </section>
  )
}
