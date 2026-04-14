import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../app/i18n'
import { FieldGroup } from '../components/FieldGroup'
import { LocalizedText } from '../components/LocalizedText'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import {
  getLocalizedTextPair,
  getSecondaryLocalizedText,
  matchesLocalizedText,
} from '../domain/localizedText'
import type { LocalizedOption, Variant } from '../domain/types'

interface CampaignEnumGroup {
  id: 'campaigns'
  values: LocalizedOption[]
}

const ALL_CAMPAIGNS = '__all__'
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
  const { locale, t } = useI18n()
  const [state, setState] = useState<VariantState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<string>(ALL_CAMPAIGNS)

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
          message: error instanceof Error ? error.message : '',
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
        selectedCampaign === ALL_CAMPAIGNS || variant.campaign.original === selectedCampaign

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
  const selectedCampaignLabel =
    state.status === 'ready'
      ? state.campaigns.find((campaign) => campaign.original === selectedCampaign) ?? null
      : null
  const activeFilters = [
    search.trim()
      ? t({
          zh: `关键词：${search.trim()}`,
          en: `Keyword: ${search.trim()}`,
        })
      : null,
    selectedCampaignLabel
      ? t({
          zh: `战役：${getLocalizedTextPair(selectedCampaignLabel, locale)}`,
          en: `Campaign: ${getLocalizedTextPair(selectedCampaignLabel, locale)}`,
        })
      : null,
  ].filter((item): item is string => Boolean(item))

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '变体限制', en: 'Variant restrictions' })}
        title={t({
          zh: '先把官方中文展示和原文回退一起接上',
          en: 'Show official Chinese labels while keeping source-text fallback',
        })}
        description={t({
          zh: '当前先接官方 definitions 归一化后的变体数据，名称、战役和限制文本都优先显示 `language_id=7` 中文，并保留官方原文用于检索和回退。',
          en: 'This page uses normalized official definitions, prefers `language_id=7` Chinese for names, campaigns, and restriction text, and still keeps the original strings for search and fallback.',
        })}
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取变体数据…', en: 'Loading variant data…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '变体数据读取失败', en: 'Variant data failed to load' })}
            detail={state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          />
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '变体总数', en: 'Variants' })}</span>
                <strong className="metric-card__value">{state.variants.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '当前匹配', en: 'Matches' })}</span>
                <strong className="metric-card__value">{filteredVariants.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '覆盖战役', en: 'Campaigns covered' })}</span>
                <strong className="metric-card__value">{campaignsWithResults}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-card__label">{t({ zh: '战役枚举', en: 'Campaign options' })}</span>
                <strong className="metric-card__value">{state.campaigns.length}</strong>
              </article>
            </div>

            <div className="filter-panel filter-panel--compact">
              <FieldGroup
                label={t({ zh: '关键词', en: 'Keyword' })}
                hint={t({
                  zh: '变体名、战役、限制文本和奖励文本都支持中英混搜。',
                  en: 'Names, campaigns, restriction text, and rewards all support mixed Chinese and English search.',
                })}
                as="label"
              >
                <input
                  className="text-input"
                  type="text"
                  placeholder={t({
                    zh: '搜变体名、限制文本、奖励文本',
                    en: 'Search names, restriction text, or rewards',
                  })}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </FieldGroup>

              <FieldGroup label={t({ zh: '战役', en: 'Campaign' })} as="label">
                <select
                  className="text-input"
                  value={selectedCampaign}
                  onChange={(event) => setSelectedCampaign(event.target.value)}
                >
                  <option value={ALL_CAMPAIGNS}>{t({ zh: '全部战役', en: 'All campaigns' })}</option>
                  {state.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.original}>
                      {getLocalizedTextPair(campaign, locale)}
                    </option>
                  ))}
                </select>
              </FieldGroup>
            </div>

            <p
              className={
                activeFilters.length > 0 ? 'supporting-text' : 'supporting-text supporting-text--placeholder'
              }
              aria-hidden={activeFilters.length === 0}
            >
              {activeFilters.length > 0
                ? `${t({ zh: '当前筛选：', en: 'Active filters: ' })}${activeFilters.join(' · ')}`
                : t({ zh: '当前筛选：', en: 'Active filters: ' })}
            </p>

            {filteredVariants.length === 0 ? (
              <StatusBanner tone="info">
                {t({
                  zh: '当前筛选条件下没有匹配变体，可以先放宽战役或关键词条件。',
                  en: 'No variants match these filters yet. Try broadening the campaign or keyword first.',
                })}
              </StatusBanner>
            ) : null}

            {filteredVariants.length > 0 ? (
              <>
                <p className="supporting-text">
                  {t({
                    zh: `当前展示 ${visibleVariants.length} / ${filteredVariants.length} 条变体记录。名称会双语展示，但长段限制文本只跟随当前界面语言显示。`,
                    en: `Showing ${visibleVariants.length} / ${filteredVariants.length} variants. Names stay bilingual in key places, while long restriction copy follows the active UI language.`,
                  })}
                </p>

                <div className="results-grid">
                  {visibleVariants.map((variant) => {
                    const secondaryName = getSecondaryLocalizedText(variant.name, locale)
                    const secondaryCampaign = getSecondaryLocalizedText(variant.campaign, locale)

                    return (
                      <article key={variant.id} className="result-card">
                        <div className="result-card__header">
                          <LocalizedText
                            text={variant.campaign}
                            mode="primary"
                            as="span"
                            className="result-card__eyebrow"
                          />
                          <LocalizedText
                            text={variant.name}
                            mode="primary"
                            as="h3"
                            className="result-card__title"
                          />
                        </div>

                        {secondaryName || secondaryCampaign ? (
                          <p className="result-card__secondary">
                            {[secondaryName, secondaryCampaign].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}

                        <div className="result-block">
                          <strong className="result-block__title">
                            {t({ zh: '限制条件', en: 'Restrictions' })}
                          </strong>
                          {variant.restrictions.length > 0 ? (
                            <ul className="bullet-list">
                              {variant.restrictions.slice(0, 4).map((restriction) => (
                                <li key={`${variant.id}-${restriction.original}-${restriction.display}`}>
                                  <LocalizedText text={restriction} mode="primary" />
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="supporting-text">
                              {t({
                                zh: '当前还没解析到明确限制文本。',
                                en: 'No explicit restriction text is available yet.',
                              })}
                            </p>
                          )}
                        </div>

                        <div className="result-block">
                          <strong className="result-block__title">{t({ zh: '奖励', en: 'Rewards' })}</strong>
                          {variant.rewards.length > 0 ? (
                            <ul className="bullet-list">
                              {variant.rewards.slice(0, 3).map((reward) => (
                                <li key={`${variant.id}-${reward.original}-${reward.display}`}>
                                  <LocalizedText text={reward} mode="primary" />
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="supporting-text">
                              {t({
                                zh: '当前官方返回里没有显式奖励文本。',
                                en: 'The official payload does not expose reward copy here yet.',
                              })}
                            </p>
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
