import { SurfaceCard } from '../components/SurfaceCard'
import { loadVersion } from '../data/client'
import type { DataVersion } from '../domain/types'
import { useEffect, useState } from 'react'

export function HomePage() {
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
          errorMessage: error instanceof Error ? error.message : '未知错误',
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  const versionText =
    versionState.status === 'ready'
      ? `${versionState.data?.current ?? '未知版本'} · ${versionState.data?.updatedAt ?? '未知日期'}`
      : versionState.status === 'error'
        ? `读取失败：${versionState.errorMessage}`
        : '正在读取数据版本…'

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="hero-panel__eyebrow">当前阶段</p>
          <h2 className="hero-panel__title">工程骨架已经落地，下一步开始补真实数据与规则闭环。</h2>
          <p className="hero-panel__description">
            当前站点已经完成基础路由、页面壳层、数据目录、数据加载约定和 GitHub Pages
            部署配置。接下来优先做英雄筛选、变体限制表达和阵型编辑器。
          </p>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-card__label">技术路线</span>
            <strong className="metric-card__value">Vite + React + TypeScript</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">默认路由</span>
            <strong className="metric-card__value">HashRouter</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">公共数据</span>
            <strong className="metric-card__value">版本化 JSON</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">当前数据版本</span>
            <strong className="metric-card__value">{versionText}</strong>
          </article>
        </div>
      </section>

      <div className="card-grid card-grid--wide">
        <SurfaceCard
          eyebrow="已落地"
          title="第一批基础设施"
          description="这一批内容先解决工程可运行、可部署、可继续扩展的问题。"
        >
          <ul className="bullet-list">
            <li>基础页面与主导航</li>
            <li>基于 `import.meta.env.BASE_URL` 的数据读取约定</li>
            <li>`public/data/version.json + public/data/v1/` 目录结构</li>
            <li>`src/domain`、`src/data`、`src/rules` 分层</li>
            <li>GitHub Actions 自动部署脚本</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard
          eyebrow="接下来"
          title="下一条开发闭环"
          description="从真正能帮助决策的页面开始，而不是先堆大全套功能。"
        >
          <ol className="ordered-list">
            <li>补充第一版英雄与限制条件字段</li>
            <li>做英雄筛选页的条件组合逻辑</li>
            <li>补 seat 冲突校验与阵型槽位渲染</li>
            <li>接入个人数据导入与本地方案保存</li>
          </ol>
        </SurfaceCard>

        <SurfaceCard
          eyebrow="约束"
          title="当前明确不做的内容"
          description="保持范围克制，先把站点的价值闭环做出来。"
        >
          <ul className="bullet-list">
            <li>不做全自动最优阵容求解器</li>
            <li>不做服务端数据库</li>
            <li>不做账号系统与云同步</li>
            <li>不做为了干净 URL 而额外增加的 SPA 回退复杂度</li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  )
}
