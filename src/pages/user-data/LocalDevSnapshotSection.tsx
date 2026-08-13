import { useI18n } from '../../app/i18n'
import type {
  UserProfileResolution,
  UserProfileSourceKind,
} from '../../data/user-profile-store'
import type { LocalDevRefreshState } from './useUserSyncModel'

type LocalDevSnapshotSectionProps = {
  readonly canLoadLocalDevSnapshot: boolean
  readonly profileResolution: UserProfileResolution
  readonly selectedProfileSource: UserProfileSourceKind
  readonly localDevRefreshState: LocalDevRefreshState
  readonly onSelectBrowserSnapshot: () => void
  readonly onSelectLocalDevSnapshot: () => void
  readonly onRefreshLocalDevSnapshot: () => void
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
  const { t } = useI18n()

  const sourceLabel =
    selectedProfileSource === 'browser-sync'
      ? t("浏览器同步快照")
      : t("本地开发快照")

  return (
    <div>
      <p>
        {t("仅本地开发：浏览器同步快照与本地开发快照必须分离。本地开发快照只读使用，不会覆盖浏览器 IndexedDB。")}
      </p>
      <p>
        {t("刷新动作会使用当前机器的私有环境变量抓取官方只读数据，并只写入被忽略的本地快照目录。")}
      </p>
      <p>
        {t("当前开发数据源：")}
        {sourceLabel}
      </p>

      {profileResolution.snapshot && (
        <p>
          {t("当前选中源拥有英雄 {p0} 个；已导入阵型 {p1} 个。", { p0: String(profileResolution.snapshot.ownedHeroes.length), p1: String(profileResolution.snapshot.importedFormationSaves.length) })}
        </p>
      )}

      {profileResolution.errorMessage != null && profileResolution.errorMessage !== '' && (
        <p role="alert">{profileResolution.errorMessage}</p>
      )}

      {localDevRefreshState.status === 'loading' && (
        <p role="status">{t("正在刷新本地开发快照…")}</p>
      )}

      {localDevRefreshState.status === 'success' && (
        <p role="status">{localDevRefreshState.message}</p>
      )}

      {localDevRefreshState.status === 'error' && (
        <p role="alert">{localDevRefreshState.message}</p>
      )}

      <div aria-label={t("开发数据源")} role="group">
        <button
          type="button"
          onClick={onSelectBrowserSnapshot}
          aria-pressed={selectedProfileSource === 'browser-sync'}
        >
          {t("使用浏览器快照")}
        </button>

        <button
          type="button"
          onClick={onSelectLocalDevSnapshot}
          disabled={!canLoadLocalDevSnapshot}
          aria-pressed={selectedProfileSource === 'local-dev-snapshot'}
        >
          {t("使用本地开发快照")}
        </button>
      </div>

      <button
        type="button"
        onClick={onRefreshLocalDevSnapshot}
        disabled={!canLoadLocalDevSnapshot || localDevRefreshState.status === 'loading'}
      >
        {t("刷新本地开发快照")}
      </button>
    </div>
  )
}
