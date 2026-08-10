import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useI18n } from '../../app/i18n'
import { useUserSyncModel } from '../user-data/useUserSyncModel'
import { formatPlannerProfileSourceLabel } from './plannerProfileSourceLabel'

export function PlannerProfileState() {
  const { t, locale } = useI18n()
  const { profileResolution } = useUserSyncModel()
  const [snapshotNow] = useState(() => Date.now())

  if (profileResolution.errorMessage != null && profileResolution.errorMessage !== '') {
    return (
      <section aria-label={t({ zh: '个人数据状态', en: 'Profile state' })}>
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
    const ageMs = snapshotNow - new Date(profileResolution.snapshot.updatedAt).getTime()
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
    const sourceLabel = formatPlannerProfileSourceLabel(
      profileResolution.resolvedSource ?? profileResolution.selectedSource,
      locale,
    )

    return (
      <section aria-label={t({ zh: '个人数据状态', en: 'Profile state' })}>
        <p>
          {t({
            zh: `${sourceLabel}已于 ${String(ageDays)} 天前更新。`,
            en: `${sourceLabel} was updated ${String(ageDays)} days ago.`,
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
    <section aria-label={t({ zh: '个人数据状态', en: 'Profile state' })}>
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
