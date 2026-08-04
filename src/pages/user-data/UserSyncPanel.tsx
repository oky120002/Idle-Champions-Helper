import { useState } from 'react'
import type { UserCredentials } from '../../domain/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
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
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const confirmDelete = (clearOverrides: boolean) => {
    setDeleteConfirmOpen(false)
    void handleDelete(clearOverrides)
  }

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
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={busy}
          >
            删除
          </button>
        )}
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="删除个人数据"
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <p className="confirm-dialog__message">
          将清除浏览器同步快照与凭证。是否同时删除手动配置的英雄能力覆盖（planner 里手调的能力数据）？
        </p>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__action confirm-dialog__action--danger"
            onClick={() => confirmDelete(true)}
            disabled={busy}
          >
            同时清除覆盖
          </button>
          <button
            type="button"
            className="confirm-dialog__action"
            onClick={() => confirmDelete(false)}
            disabled={busy}
          >
            保留覆盖
          </button>
          <button
            type="button"
            className="confirm-dialog__action"
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={busy}
          >
            取消
          </button>
        </div>
      </ConfirmDialog>

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
