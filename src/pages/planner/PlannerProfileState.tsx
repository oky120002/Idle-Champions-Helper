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
      <section aria-label={t("个人数据状态")}>
        <p role="alert">
          {t("读取数据失败：{p0}", { p0: profileResolution.errorMessage })}
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
      <section aria-label={t("个人数据状态")}>
        <p>
          {t("{p0}已于 {p1} 天前更新。", { p0: sourceLabel, p1: String(ageDays) })}
        </p>
        {ageDays > 7 && (
          <p>
            {t("数据可能过期，建议重新同步或切换数据源。")}
          </p>
        )}
      </section>
    )
  }

  return (
    <section aria-label={t("个人数据状态")}>
      <p>
        {t("尚未导入个人数据。")}
        <Link to="/user-data">
          {t("前往个人数据页面")}
        </Link>
      </p>
    </section>
  )
}
