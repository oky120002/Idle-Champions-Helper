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
    <section aria-label={t("同步状态")}>
      {syncState.status === 'no-snapshot' && (
        <p>
          {t("浏览器内尚未保存同步快照。先读取并校验凭证，然后手动同步。")}
        </p>
      )}

      {syncState.status === 'loaded' && (
        <div>
          <p>
            {t("浏览器同步快照已于 {p0} 天前更新。", { p0: String(syncState.ageDays) })}
          </p>
          <p>
            {t("拥有英雄 {p0} 个；已导入阵型 {p1} 个；同步警告 {p2} 条。", { p0: String(syncState.snapshot.ownedHeroes.length), p1: String(syncState.snapshot.importedFormationSaves.length), p2: String(syncState.snapshot.warnings.length) })}
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
          {t("手动同步")}
        </button>

        {syncState.status !== 'no-snapshot' && (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={busy}
          >
            {t("删除")}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t("删除个人数据")}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <p className="confirm-dialog__message">
          {t("将清除浏览器同步快照与凭证。是否同时删除手动配置的英雄能力覆盖（planner 里手调的能力数据）？")}
        </p>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__action confirm-dialog__action--danger"
            onClick={() => confirmDelete(true)}
            disabled={busy}
          >
            {t("同时清除覆盖")}
          </button>
          <button
            type="button"
            className="confirm-dialog__action"
            onClick={() => confirmDelete(false)}
            disabled={busy}
          >
            {t("保留覆盖")}
          </button>
          <button
            type="button"
            className="confirm-dialog__action"
            onClick={() => setDeleteConfirmOpen(false)}
            disabled={busy}
          >
            {t("取消")}
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
