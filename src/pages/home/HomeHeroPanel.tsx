import { LabeledValueCardGrid } from '../../components/LabeledValueCardGrid'
import { useI18n } from '../../app/i18n'
import type { DataVersion } from '../../domain/types'

interface HomeHeroPanelProps {
  readonly versionState: {
    status: 'loading' | 'ready' | 'error'
    data: DataVersion | null
    errorMessage: string | null
  }
}

export function HomeHeroPanel({ versionState }: HomeHeroPanelProps) {
  const { t } = useI18n()

  let versionText = t("正在读取数据版本…")

  if (versionState.status === 'ready') {
    versionText = `${versionState.data?.current ?? t("未知版本")} · ${versionState.data?.updatedAt ?? t("未知日期")}`
  } else if (versionState.status === 'error') {
    versionText = `${t("读取失败")}: ${versionState.errorMessage ?? t("未知错误")}`
  }

  const metricItems = [
    { id: 'stack', label: t("技术路线"), value: 'Vite + React + TypeScript' },
    { id: 'router', label: t("默认路由"), value: 'HashRouter' },
    { id: 'shared-data', label: t("公共数据"), value: t("版本化 JSON") },
    { id: 'data-version', label: t("当前数据版本"), value: versionText },
  ]

  return (
    <section className="hero-panel">
      <div>
        <p className="hero-panel__eyebrow">{t("当前阶段")}</p>
        <h2 className="hero-panel__title">
          {t("真实数据、本地持久化和回归骨架已经接上，下一步补阵型规则与上下文体验。")}
        </h2>
        <p className="hero-panel__description">
          {t("当前站点已经接上官方 definitions 公共数据、`language_id=7` 中文展示层、157 个唯一官方阵型布局、最近草稿 / 命名方案的 IndexedDB 持久化，以及本地回归测试基线。接下来优先补阵型规则、场景筛选和个人数据映射。")}
        </p>
      </div>

      <LabeledValueCardGrid
        items={metricItems}
        gridClassName="metric-grid"
        cardClassName="metric-card"
        labelClassName="metric-card__label"
        valueClassName="metric-card__value"
      />
    </section>
  )
}
