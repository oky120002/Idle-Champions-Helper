import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import { getLocalizedOriginal, matchesLocalizedText } from '../domain/localizedText'
import type { LocalizedOption, Variant } from '../domain/types'

interface CampaignEnumGroup {
  id: 'campaigns'
  values: LocalizedOption[]
}

const MAX_VISIBLE_VARIANTS = 60

type VariantState =
  | { status: 'loading' }
  | {
      status: 'ready'
      variants: Variant[]
      campaigns: LocalizedOption[]
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
            (item): item is LocalizedOption =>
              typeof item === 'object' &&
              item !== null &&
              typeof item.id === 'string' &&
              typeof item.original === 'string' &&
              typeof item.display === 'string',
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
        selectedCampaign === '全部战役' || variant.campaign.original === selectedCampaign

      const matchesSearch =
        !query ||
        matchesLocalizedText(variant.name, query) ||
        matchesLocalizedText(variant.campaign, query) ||
        variant.restrictions.some((item) => matchesLocalizedText(item, query)) ||
        variant.rewards.some((item) => matchesLocalizedText(item, query))

      return matchesCampaign && matchesSearch
    })
  }, [search, selectedCampaign, state])

  const visibleVariants = filteredVariants.slice(0, MAX_VISIBLE_VARIANTS)
  const campaignsWithResults = new Set(filteredVariants.map((variant) => variant.campaign.original)).size

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow="变体限制"
        title="先把官方中文展示和原文回退一起接上"
        description="当前先接官方 definitions 归一化后的变体数据，名称、战役和限制文本都优先显示 `language_id=7` 中文，并保留官方原文用于检索和回退。"
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
                    <option key={campaign.id} value={campaign.original}>
                      {campaign.display}
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
                  当前先优先展示官方中文；更细的规则拆解仍会放到后续规则层。
                </p>

                <div className="results-grid">
                  {visibleVariants.map((variant) => {
                    const originalLine = [variant.name, variant.campaign]
                      .map((item) => getLocalizedOriginal(item))
                      .filter((item): item is string => Boolean(item))
                      .join(' · ')

                    return (
                      <article key={variant.id} className="result-card">
                        <div className="result-card__header">
                          <span className="result-card__eyebrow">{variant.campaign.display}</span>
                          <h3 className="result-card__title">{variant.name.display}</h3>
                        </div>

                        {originalLine ? <p className="supporting-text">{originalLine}</p> : null}

                        <div className="result-block">
                          <strong className="result-block__title">限制条件</strong>
                          {variant.restrictions.length > 0 ? (
                            <ul className="bullet-list">
                              {variant.restrictions.slice(0, 4).map((restriction) => (
                                <li key={`${variant.id}-${restriction.original}-${restriction.display}`}>
                                  {restriction.display}
                                </li>
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
                                <li key={`${variant.id}-${reward.original}-${reward.display}`}>
                                  {reward.display}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="supporting-text">当前官方返回里没有显式奖励文本。</p>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
