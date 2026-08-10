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
      ? t({ zh: '浏览器同步快照', en: 'Browser sync snapshot' })
      : t({ zh: '本地开发快照', en: 'Local dev snapshot' })

  return (
    <div>
      <p>
        {t({
          zh: '仅本地开发：浏览器同步快照与本地开发快照必须分离。本地开发快照只读使用，不会覆盖浏览器 IndexedDB。',
          en: 'Dev only: browser sync snapshots and local dev snapshots must stay separate. The local dev snapshot is read-only and never overwrites the browser IndexedDB.',
        })}
      </p>
      <p>
        {t({
          zh: '刷新动作会使用当前机器的私有环境变量抓取官方只读数据，并只写入被忽略的本地快照目录。',
          en: 'Refreshing uses this machine’s private environment variables to fetch official read-only data, writing only to the ignored local snapshot directory.',
        })}
      </p>
      <p>
        {t({ zh: '当前开发数据源：', en: 'Current dev data source: ' })}
        {sourceLabel}
      </p>

      {profileResolution.snapshot && (
        <p>
          {t({
            zh: `当前选中源拥有英雄 ${String(profileResolution.snapshot.ownedHeroes.length)} 个；已导入阵型 ${String(profileResolution.snapshot.importedFormationSaves.length)} 个。`,
            en: `Current source has ${String(profileResolution.snapshot.ownedHeroes.length)} owned heroes; ${String(profileResolution.snapshot.importedFormationSaves.length)} imported formations.`,
          })}
        </p>
      )}

      {profileResolution.errorMessage != null && profileResolution.errorMessage !== '' && (
        <p role="alert">{profileResolution.errorMessage}</p>
      )}

      {localDevRefreshState.status === 'loading' && (
        <p role="status">{t({ zh: '正在刷新本地开发快照…', en: 'Refreshing local dev snapshot…' })}</p>
      )}

      {localDevRefreshState.status === 'success' && (
        <p role="status">{localDevRefreshState.message}</p>
      )}

      {localDevRefreshState.status === 'error' && (
        <p role="alert">{localDevRefreshState.message}</p>
      )}

      <div aria-label={t({ zh: '开发数据源', en: 'Dev data source' })} role="group">
        <button
          type="button"
          onClick={onSelectBrowserSnapshot}
          aria-pressed={selectedProfileSource === 'browser-sync'}
        >
          {t({ zh: '使用浏览器快照', en: 'Use browser snapshot' })}
        </button>

        <button
          type="button"
          onClick={onSelectLocalDevSnapshot}
          disabled={!canLoadLocalDevSnapshot}
          aria-pressed={selectedProfileSource === 'local-dev-snapshot'}
        >
          {t({ zh: '使用本地开发快照', en: 'Use local dev snapshot' })}
        </button>
      </div>

      <button
        type="button"
        onClick={onRefreshLocalDevSnapshot}
        disabled={!canLoadLocalDevSnapshot || localDevRefreshState.status === 'loading'}
      >
        {t({ zh: '刷新本地开发快照', en: 'Refresh local dev snapshot' })}
      </button>
    </div>
  )
}
