import { Link } from 'react-router-dom'

import { useI18n } from '../../app/i18n'
import { useUserSyncModel } from '../user-data/useUserSyncModel'

export function PlannerProfileState() {
  const { t } = useI18n()
  const { syncState } = useUserSyncModel()

  return (
    <section aria-label="个人数据状态" role="region">
      {syncState.status === 'no-snapshot' && (
        <p>
          {t({
            zh: '尚未导入个人数据。',
            en: 'No user data imported.',
          })}
          <Link to="/user-data">
            {t({
              zh: '前往个人数据页面',
              en: 'Go to User Data page',
            })}
          </Link>
        </p>
      )}

      {syncState.status === 'loaded' && (
        <>
          <p>
            {t({
              zh: `本地数据已于 ${syncState.ageDays} 天前更新。`,
              en: `Local data was updated ${syncState.ageDays} days ago.`,
            })}
          </p>
          {syncState.ageDays > 7 && (
            <p>
              {t({
                zh: '数据可能过期，建议重新同步。',
                en: 'Data may be outdated. Consider re-syncing.',
              })}
            </p>
          )}
        </>
      )}

      {syncState.status === 'error' && (
        <p role="alert">
          {t({
            zh: `读取数据失败：${syncState.message}`,
            en: `Failed to read data: ${syncState.message}`,
          })}
        </p>
      )}
    </section>
  )
}
