import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import type { Variant } from '../domain/types'

interface CampaignOption {
  id: string
  name: string
}

interface CampaignEnumGroup {
  id: 'campaigns'
  values: CampaignOption[]
}

const MAX_VISIBLE_VARIANTS = 60

type VariantState =
  | { status: 'loading' }
  | {
      status: 'ready'
      variants: Variant[]
      campaigns: CampaignOption[]
    }
  | {
      status: 'error'
      message: string
    }

function isCampaignEnumGroup(value: unknown): value is CampaignEnumGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    value.id === 'campaigns' &&
    'values' in value &&
    Array.isArray(value.values)
  )
}

export function VariantsPage() {
  const [state, setState] = useState<VariantState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('全部战役')

  useEffect(() => {
    let disposed = false

    Promise.all([loadCollection<Variant>('variants'), loadCollection<unknown>('enums')])
      .then(([variantCollection, enumCollection]) => {
        if (disposed) {
          return
        }

        const campaigns =
          enumCollection.items.find(isCampaignEnumGroup)?.values.filter(
            (item): item is CampaignOption =>
              typeof item === 'object' &&
              item !== null &&
              typeof item.id === 'string' &&
              typeof item.name === 'string',
          ) ?? []

        setState({
          status: 'ready',
          variants: variantCollection.items,
          campaigns,
        })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '未知错误',
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  const filteredVariants = useMemo(() => {
    if (state.status !== 'ready') {
      return []
    }

    const query = search.trim().toLowerCase()

    return state.variants.filter((variant) => {
      const matchesCampaign =
        selectedCampaign === '全部战役' || variant.campaign === selectedCampaign

      const matchesSearch =
        !query ||
        variant.name.toLowerCase().includes(query) ||
        variant.campaign.toLowerCase().includes(query) ||
        variant.restrictions.some((item) => item.toLowerCase().includes(query)) ||
        variant.rewards.some((item) => item.toLowerCase().includes(query))

      return matchesCampaign && matchesSearch
    })
  }, [search, selectedCampaign, state])

  const visibleVariants = filteredVariants.slice(0, MAX_VISIBLE_VARIANTS)
  const campaignsWithResults = new Set(filteredVariants.map((variant) => variant.campaign)).size

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="变体限制"
        title="先把官方原始限制文本稳定读出来"
        description="当前先接官方 definitions 归一化后的变体数据，优先解决“我想快速搜到哪个变体、看见哪些限制”的第一步。"
      >
        {state.status === 'loading' ? (
          <div className="status-banner status-banner--info">正在读取变体数据…</div>
        ) : null}

        {state.status === 'error' ? (
          <div className="status-banner status-banner--error">变体数据读取失败：{state.message}</div>
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">变体总数</span>
                <strong className="metric-card__value">{state.variants.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">当前匹配</span>
                <strong className="metric-card__value">{filteredVariants.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">覆盖战役</span>
                <strong className="metric-card__value">{campaignsWithResults}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">战役枚举</span>
                <strong className="metric-card__value">{state.campaigns.length}</strong>
              </article>
            </div>

            <div className="filter-panel filter-panel--compact">
              <label className="form-field">
                <span className="field-label">关键词</span>
                <input
                  className="text-input"
                  type="text"
                  placeholder="搜变体名、限制文本、奖励文本"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <label className="form-field">
                <span className="field-label">战役</span>
                <select
                  className="text-input"
                  value={selectedCampaign}
                  onChange={(event) => setSelectedCampaign(event.target.value)}
                >
                  <option value="全部战役">全部战役</option>
                  {state.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.name}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredVariants.length === 0 ? (
              <div className="status-banner status-banner--info">
                当前筛选条件下没有匹配变体，可以先放宽战役或关键词条件。
              </div>
            ) : null}

            {filteredVariants.length > 0 ? (
              <>
                <p className="supporting-text">
                  当前展示 {visibleVariants.length} / {filteredVariants.length} 条变体记录。
                  这一页目前仍是“原文优先”，中文规则拆解会放到后续规则层。
                </p>

                <div className="results-grid">
                  {visibleVariants.map((variant) => (
                    <article key={variant.id} className="result-card">
                      <div className="result-card__header">
                        <span className="result-card__eyebrow">{variant.campaign}</span>
                        <h3 className="result-card__title">{variant.name}</h3>
                      </div>

                      <div className="result-block">
                        <strong className="result-block__title">限制条件</strong>
                        {variant.restrictions.length > 0 ? (
                          <ul className="bullet-list">
                            {variant.restrictions.slice(0, 4).map((restriction) => (
                              <li key={restriction}>{restriction}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="supporting-text">当前还没解析到明确限制文本。</p>
                        )}
                      </div>

                      <div className="result-block">
                        <strong className="result-block__title">奖励</strong>
                        {variant.rewards.length > 0 ? (
                          <ul className="bullet-list">
                            {variant.rewards.slice(0, 3).map((reward) => (
                              <li key={reward}>{reward}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="supporting-text">当前官方返回里没有显式奖励文本。</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
