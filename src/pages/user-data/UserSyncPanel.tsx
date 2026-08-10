import { useState } from 'react'
import type { UserCredentials } from '../../domain/types'
import { useI18n } from '../../app/i18n'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { LocalDevSnapshotSection } from './LocalDevSnapshotSection'
import { useUserSyncModel } from './useUserSyncModel'

type UserSyncPanelProps = {
  readonly credentials?: UserCredentials | null
}

export function UserSyncPanel({ credentials = null }: UserSyncPanelProps) {
  const { t } = useI18n()
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
    <section aria-label={t({ zh: '同步状态', en: 'Sync status' })}>
      {syncState.status === 'no-snapshot' && (
        <p>
          {t({
            zh: '浏览器内尚未保存同步快照。先读取并校验凭证，然后手动同步。',
            en: 'No sync snapshot saved in the browser yet. Read and validate credentials first, then sync manually.',
          })}
        </p>
      )}

      {syncState.status === 'loaded' && (
        <div>
          <p>
            {t({
              zh: `浏览器同步快照已于 ${String(syncState.ageDays)} 天前更新。`,
              en: `Browser sync snapshot was updated ${String(syncState.ageDays)} days ago.`,
            })}
          </p>
          <p>
            {t({
              zh: `拥有英雄 ${String(syncState.snapshot.ownedHeroes.length)} 个；已导入阵型 ${String(syncState.snapshot.importedFormationSaves.length)} 个；同步警告 ${String(syncState.snapshot.warnings.length)} 条。`,
              en: `Owned heroes: ${String(syncState.snapshot.ownedHeroes.length)}; imported formations: ${String(syncState.snapshot.importedFormationSaves.length)}; sync warnings: ${String(syncState.snapshot.warnings.length)}.`,
            })}
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
          {t({ zh: '手动同步', en: 'Sync manually' })}
        </button>

        {syncState.status !== 'no-snapshot' && (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={busy}
          >
            {t({ zh: '删除', en: 'Delete' })}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t({ zh: '删除个人数据', en: 'Delete personal data' })}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <p className="confirm-dialog__message">
          {t({
            zh: '将清除浏览器同步快照与凭证。是否同时删除手动配置的英雄能力覆盖（planner 里手调的能力数据）？',
            en: 'This will clear the browser sync snapshot and credentials. Also delete manually configured hero ability overrides (ability data tuned in the planner)?',
          })}
        </p>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__action confirm-dialog__action--danger"
            onClick={() => confirmDelete(true)}
            disabled={busy}
          >
            {t({ zh: '同时清除覆盖', en: 'Also clear overrides' })}
          </button>
          <button
            type="button"
            className="confirm-dialog__action"
            onClick={() => confirmDelete(false)}
            disabled={busy}
          >
            {t({ zh: '保留覆盖', en: 'Keep overrides' })}
          </button>
          <button
            type="button"
            className="confirm-dialog__action"
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={busy}
          >
            {t({ zh: '取消', en: 'Cancel' })}
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
