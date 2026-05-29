import { Link } from 'react-router-dom'

import { useI18n } from '../../app/i18n'
import { useUserSyncModel } from '../user-data/useUserSyncModel'
import { formatPlannerProfileSourceLabel } from './plannerProfileSourceLabel'

export function PlannerProfileState() {
  const { t } = useI18n()
  const { profileResolution } = useUserSyncModel()

  if (profileResolution.errorMessage) {
    return (
      <section aria-label="个人数据状态" role="region">
        <p role="alert">
          {t({
            zh: `读取数据失败：${profileResolution.errorMessage}`,
            en: `Failed to read data: ${profileResolution.errorMessage}`,
          })}
        </p>
      </section>
    )
  }

  if (profileResolution.snapshot) {
    const ageMs = Date.now() - new Date(profileResolution.snapshot.updatedAt).getTime()
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
    const sourceLabel = formatPlannerProfileSourceLabel(
      profileResolution.resolvedSource ?? profileResolution.selectedSource,
    )

    return (
      <section aria-label="个人数据状态" role="region">
        <p>
          {t({
            zh: `${sourceLabel}已于 ${ageDays} 天前更新。`,
            en: `${sourceLabel} was updated ${ageDays} days ago.`,
          })}
        </p>
        {ageDays > 7 && (
          <p>
            {t({
              zh: '数据可能过期，建议重新同步或切换数据源。',
              en: 'Data may be outdated. Consider re-syncing or switching the source.',
            })}
          </p>
        )}
      </section>
    )
  }

  return (
    <section aria-label="个人数据状态" role="region">
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
    </section>
  )
}
