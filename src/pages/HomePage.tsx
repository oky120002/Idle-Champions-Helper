import { useEffect, useState } from 'react'
import { type LocaleText, useI18n } from '../app/i18n'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadVersion } from '../data/client'
import type { DataVersion } from '../domain/types'

const shippedItems: LocaleText[] = [
  { zh: '基础页面与主导航', en: 'Base pages and primary navigation' },
  { zh: '基于 `import.meta.env.BASE_URL` 的数据读取约定', en: 'Data loading based on `import.meta.env.BASE_URL`' },
  { zh: '`public/data/version.json + public/data/v1/` 目录结构', en: '`public/data/version.json + public/data/v1/` layout' },
  { zh: '`src/domain`、`src/data`、`src/rules` 分层', en: '`src/domain`, `src/data`, and `src/rules` layering' },
  { zh: 'GitHub Actions 自动部署脚本', en: 'GitHub Actions deployment workflow' },
]

const nextSteps: LocaleText[] = [
  { zh: '补充第一版英雄与限制条件字段', en: 'Expand the first pass of champion and restriction fields' },
  { zh: '做英雄筛选页的条件组合逻辑', en: 'Tighten the filtering combinations on the champions page' },
  { zh: '补 seat 冲突校验与阵型槽位渲染', en: 'Refine seat-conflict validation and formation slot rendering' },
  { zh: '接入个人数据导入与本地方案保存', en: 'Add personal data import and local preset storage' },
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
              zh: '工程骨架已经落地，下一步开始补真实数据与规则闭环。',
              en: 'The engineering skeleton is in place; next comes real data and tighter rule loops.',
            })}
          </h2>
          <p className="hero-panel__description">
            {t({
              zh: '当前站点已经完成基础路由、页面壳层、数据目录、数据加载约定和 GitHub Pages 部署配置。接下来优先做英雄筛选、变体限制表达和阵型编辑器。',
              en: 'The site already has base routing, page shells, data directories, load conventions, and GitHub Pages deployment. Next up are champion filters, clearer variant restrictions, and the formation editor.',
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
