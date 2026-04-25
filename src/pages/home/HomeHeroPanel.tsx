import { LabeledValueCardGrid } from '../../components/LabeledValueCardGrid'
import { useI18n } from '../../app/i18n'
import type { DataVersion } from '../../domain/types'

interface HomeHeroPanelProps {
  versionState: {
    status: 'loading' | 'ready' | 'error'
    data: DataVersion | null
    errorMessage: string | null
  }
}

export function HomeHeroPanel({ versionState }: HomeHeroPanelProps) {
  const { t } = useI18n()

  let versionText = t({ zh: '正在读取数据版本…', en: 'Loading data version…' })

  if (versionState.status === 'ready') {
    versionText = `${versionState.data?.current ?? t({ zh: '未知版本', en: 'Unknown version' })} · ${versionState.data?.updatedAt ?? t({ zh: '未知日期', en: 'Unknown date' })}`
  } else if (versionState.status === 'error') {
    versionText = `${t({ zh: '读取失败', en: 'Load failed' })}: ${versionState.errorMessage ?? t({ zh: '未知错误', en: 'Unknown error' })}`
  }

  const metricItems = [
    { id: 'stack', label: t({ zh: '技术路线', en: 'Stack' }), value: 'Vite + React + TypeScript' },
    { id: 'router', label: t({ zh: '默认路由', en: 'Router' }), value: 'HashRouter' },
    { id: 'shared-data', label: t({ zh: '公共数据', en: 'Shared data' }), value: t({ zh: '版本化 JSON', en: 'Versioned JSON' }) },
    { id: 'data-version', label: t({ zh: '当前数据版本', en: 'Current data version' }), value: versionText },
  ]

  return (
    <section className="hero-panel">
      <div>
        <p className="hero-panel__eyebrow">{t({ zh: '当前阶段', en: 'Current stage' })}</p>
        <h2 className="hero-panel__title">
          {t({
            zh: '真实数据、本地持久化和回归骨架已经接上，下一步补阵型规则与上下文体验。',
            en: 'Real data, local persistence, and the regression baseline are in place; next comes tighter formation rules and context UX.',
          })}
        </h2>
        <p className="hero-panel__description">
          {t({
            zh: '当前站点已经接上官方 definitions 公共数据、`language_id=7` 中文展示层、157 个唯一官方阵型布局、最近草稿 / 命名方案的 IndexedDB 持久化，以及本地回归测试基线。接下来优先补阵型规则、场景筛选和个人数据映射。',
            en: 'The site now uses official definitions data, the `language_id=7` Chinese display layer, 157 unique official formation layouts, IndexedDB-backed recent drafts and presets, plus a local regression baseline. Next up are formation rules, scenario filtering, and user-data mapping.',
          })}
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
