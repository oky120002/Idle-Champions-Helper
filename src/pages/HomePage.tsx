import { useEffect, useState } from 'react'
import { type LocaleText, useI18n } from '../app/i18n'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadVersion } from '../data/client'
import type { DataVersion } from '../domain/types'

const shippedItems: LocaleText[] = [
  { zh: '基础页面与主导航', en: 'Base pages and primary navigation' },
  { zh: '基于 `import.meta.env.BASE_URL` 的数据读取约定', en: 'Data loading based on `import.meta.env.BASE_URL`' },
  { zh: '`public/data/version.json + public/data/v1/` 版本化公共数据目录', en: 'Versioned shared data under `public/data/version.json + public/data/v1/`' },
  { zh: '官方原文 + `language_id=7` 中文展示双字段数据', en: 'Dual-field data from official source text plus `language_id=7` Chinese labels' },
  { zh: '官方 definitions 自动提取的阵型布局库', en: 'Formation layouts extracted from official definitions' },
  { zh: '`IndexedDB` 最近草稿与命名方案保存 / 恢复', en: '`IndexedDB` recent-draft and named-preset save / restore flow' },
  { zh: '`Vitest + Playwright` 本地回归基线', en: '`Vitest + Playwright` local regression baseline' },
]

const nextSteps: LocaleText[] = [
  { zh: '给阵型页补场景筛选、搜索与来源定位', en: 'Add scenario filtering, search, and source targeting to the formation page' },
  { zh: '完善 seat 冲突校验与候选英雄约束提示', en: 'Tighten seat-conflict validation and candidate champion guidance' },
  { zh: '把个人数据导入结果安全写入 `IndexedDB` 并接到页面状态', en: 'Persist imported user data into `IndexedDB` and wire it into page state' },
  { zh: '扩展方案管理：删除、覆盖保存与更细标签', en: 'Expand preset management with delete, overwrite, and richer tags' },
]

const nonGoals: LocaleText[] = [
  { zh: '不做全自动最优阵容求解器', en: 'No fully automatic optimal formation solver' },
  { zh: '不做服务端数据库', en: 'No server-side database' },
  { zh: '不做账号系统与云同步', en: 'No account system or cloud sync' },
  { zh: '不做为了干净 URL 而额外增加的 SPA 回退复杂度', en: 'No extra SPA fallback complexity just for clean URLs' },
]

export function HomePage() {
  const { t } = useI18n()
  const [versionState, setVersionState] = useState<{
    status: 'loading' | 'ready' | 'error'
    data: DataVersion | null
    errorMessage: string | null
  }>({
    status: 'loading',
    data: null,
    errorMessage: null,
  })

  useEffect(() => {
    let disposed = false

    loadVersion()
      .then((data) => {
        if (disposed) {
          return
        }

        setVersionState({
          status: 'ready',
          data,
          errorMessage: null,
        })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        setVersionState({
          status: 'error',
          data: null,
          errorMessage: error instanceof Error ? error.message : null,
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  let versionText = t({ zh: '正在读取数据版本…', en: 'Loading data version…' })

  if (versionState.status === 'ready') {
    versionText = `${versionState.data?.current ?? t({ zh: '未知版本', en: 'Unknown version' })} · ${versionState.data?.updatedAt ?? t({ zh: '未知日期', en: 'Unknown date' })}`
  } else if (versionState.status === 'error') {
    versionText = `${t({ zh: '读取失败', en: 'Load failed' })}: ${versionState.errorMessage ?? t({ zh: '未知错误', en: 'Unknown error' })}`
  }

  return (
    <div className="page-stack">
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

        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-card__label">{t({ zh: '技术路线', en: 'Stack' })}</span>
            <strong className="metric-card__value">Vite + React + TypeScript</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">{t({ zh: '默认路由', en: 'Router' })}</span>
            <strong className="metric-card__value">HashRouter</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">{t({ zh: '公共数据', en: 'Shared data' })}</span>
            <strong className="metric-card__value">{t({ zh: '版本化 JSON', en: 'Versioned JSON' })}</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">{t({ zh: '当前数据版本', en: 'Current data version' })}</span>
            <strong className="metric-card__value">{versionText}</strong>
          </article>
        </div>
      </section>

      <div className="card-grid card-grid--wide">
        <SurfaceCard
          eyebrow={t({ zh: '已落地', en: 'Shipped' })}
          title={t({ zh: '第一批基础设施', en: 'First infrastructure pass' })}
          description={t({
            zh: '这一批内容先解决工程可运行、可部署、可继续扩展的问题。',
            en: 'This batch focuses on keeping the project runnable, deployable, and easy to extend.',
          })}
        >
          <ul className="bullet-list">
            {shippedItems.map((item) => (
              <li key={item.zh}>{t(item)}</li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard
          eyebrow={t({ zh: '接下来', en: 'Next' })}
          title={t({ zh: '下一条开发闭环', en: 'Next delivery loop' })}
          description={t({
            zh: '从真正能帮助决策的页面开始，而不是先堆大全套功能。',
            en: 'Start with pages that genuinely help decisions instead of piling on a giant feature list.',
          })}
        >
          <ol className="ordered-list">
            {nextSteps.map((item) => (
              <li key={item.zh}>{t(item)}</li>
            ))}
          </ol>
        </SurfaceCard>

        <SurfaceCard
          eyebrow={t({ zh: '约束', en: 'Boundaries' })}
          title={t({ zh: '当前明确不做的内容', en: 'What we are explicitly not doing yet' })}
          description={t({
            zh: '保持范围克制，先把站点的价值闭环做出来。',
            en: 'Keep the scope disciplined and build the site’s value loop before anything else.',
          })}
        >
          <ul className="bullet-list">
            {nonGoals.map((item) => (
              <li key={item.zh}>{t(item)}</li>
            ))}
          </ul>
        </SurfaceCard>
      </div>
    </div>
  )
}
