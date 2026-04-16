import { useEffect, useMemo, useState } from 'react'
import { type AppLocale, useI18n } from '../app/i18n'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection, resolveDataUrl } from '../data/client'
import {
  getPrimaryLocalizedText,
  getSecondaryLocalizedText,
  matchesLocalizedText,
} from '../domain/localizedText'
import type { Pet, PetAcquisition, PetAcquisitionKind } from '../domain/types'

type SourceFilter = 'all' | PetAcquisitionKind

type AssetFilter = 'all' | 'complete' | 'missing'

type PetState =
  | { status: 'loading' }
  | { status: 'ready'; pets: Pet[] }
  | { status: 'error'; message: string }

const EMPTY_PETS: Pet[] = []

function buildIllustrationAlt(pet: Pet, locale: AppLocale) {
  const name = getPrimaryLocalizedText(pet.name, locale)
  return locale === 'zh-CN' ? `${name}立绘` : `${name} illustration`
}

function buildIconAlt(pet: Pet, locale: AppLocale) {
  const name = getPrimaryLocalizedText(pet.name, locale)
  return locale === 'zh-CN' ? `${name}图标` : `${name} icon`
}

function buildAcquisitionLabel(acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.kind === 'gems') {
    return locale === 'zh-CN' ? '宝石商店' : 'Gem shop'
  }

  if (acquisition.kind === 'patron') {
    return locale === 'zh-CN' ? '赞助商商店' : 'Patron shop'
  }

  if (acquisition.kind === 'not-yet-available') {
    return locale === 'zh-CN' ? '暂未开放' : 'Not yet available'
  }

  if (acquisition.kind === 'premium') {
    const premiumName = acquisition.premiumPackName?.original.toLowerCase() ?? ''

    if (acquisition.sourceType === 'dlc') {
      return locale === 'zh-CN' ? '购买 · DLC' : 'Purchase · DLC'
    }

    if (premiumName.includes('theme pack')) {
      return locale === 'zh-CN' ? '购买 · 主题包' : 'Purchase · Theme pack'
    }

    if (premiumName.includes('familiar pack')) {
      return locale === 'zh-CN' ? '购买 · 熟悉魔宠包' : 'Purchase · Familiar pack'
    }

    if (acquisition.sourceType === 'flash_sale') {
      return locale === 'zh-CN' ? '购买 · 限时闪促' : 'Purchase · Flash sale'
    }

    return locale === 'zh-CN' ? '购买 · 付费包' : 'Purchase · Premium pack'
  }

  return locale === 'zh-CN' ? '来源待确认' : 'Source unconfirmed'
}

function formatNumber(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale).format(value)
}

function buildAcquisitionDetail(acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.kind === 'gems' && acquisition.gemCost !== null) {
    const amount = formatNumber(acquisition.gemCost, locale)
    return locale === 'zh-CN' ? `${amount} 宝石` : `${amount} gems`
  }

  if (acquisition.kind === 'patron' && acquisition.patronName && acquisition.patronCost !== null) {
    const patronName = getPrimaryLocalizedText(acquisition.patronName, locale)
    const currency = acquisition.patronCurrency
      ? getPrimaryLocalizedText(acquisition.patronCurrency, locale)
      : locale === 'zh-CN'
        ? '赞助商货币'
        : 'patron currency'
    const amount = formatNumber(acquisition.patronCost, locale)
    return `${patronName} · ${amount} ${currency}`
  }

  if (acquisition.premiumPackName) {
    return getPrimaryLocalizedText(acquisition.premiumPackName, locale)
  }

  if (acquisition.kind === 'not-yet-available') {
    return locale === 'zh-CN' ? '官方 definitions 当前标记为未开放' : 'Marked as not yet available in current definitions'
  }

  if (acquisition.kind === 'unknown' && acquisition.sourceType) {
    return `source=${acquisition.sourceType}`
  }

  return null
}

function buildAcquisitionNote(acquisition: PetAcquisition, locale: AppLocale) {
  if (acquisition.kind === 'patron' && acquisition.patronInfluence !== null) {
    const amount = formatNumber(acquisition.patronInfluence, locale)
    return locale === 'zh-CN' ? `需要 ${amount} 影响力解锁` : `Requires ${amount} influence to unlock`
  }

  if (acquisition.kind === 'premium' && acquisition.sourceType === 'flash_sale' && !acquisition.premiumPackName) {
    return locale === 'zh-CN'
      ? '当前 definitions 只标记为 flash_sale，未映射到固定礼包。'
      : 'Current definitions only mark this pet as flash_sale without a fixed pack mapping.'
  }

  if (acquisition.kind === 'unknown' && !acquisition.sourceType) {
    return locale === 'zh-CN' ? '当前 definitions 里没有稳定来源标注。' : 'Current definitions do not include a stable source marker.'
  }

  return null
}

function buildStatusLabel(pet: Pet, locale: AppLocale) {
  return pet.isAvailable
    ? locale === 'zh-CN'
      ? 'definitions 已启用'
      : 'Definitions enabled'
    : locale === 'zh-CN'
      ? 'definitions 未启用'
      : 'Definitions disabled'
}

function matchesPetQuery(pet: Pet, query: string) {
  if (!query.trim()) {
    return true
  }

  if (matchesLocalizedText(pet.name, query)) {
    return true
  }

  if (pet.description && matchesLocalizedText(pet.description, query)) {
    return true
  }

  const normalizedQuery = query.trim().toLowerCase()
  const haystack = [
    pet.acquisition.sourceType ?? '',
    pet.acquisition.premiumPackName?.display ?? '',
    pet.acquisition.premiumPackName?.original ?? '',
    pet.acquisition.patronName?.display ?? '',
    pet.acquisition.patronName?.original ?? '',
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}

export function PetsPage() {
  const { locale, t } = useI18n()
  const [state, setState] = useState<PetState>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all')

  useEffect(() => {
    let disposed = false

    loadCollection<Pet>('pets')
      .then((collection) => {
        if (disposed) {
          return
        }

        setState({ status: 'ready', pets: collection.items })
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

  const pets = state.status === 'ready' ? state.pets : EMPTY_PETS
  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      if (sourceFilter !== 'all' && pet.acquisition.kind !== sourceFilter) {
        return false
      }

      const hasCompleteArt = Boolean(pet.icon && pet.illustration)

      if (assetFilter === 'complete' && !hasCompleteArt) {
        return false
      }

      if (assetFilter === 'missing' && hasCompleteArt) {
        return false
      }

      return matchesPetQuery(pet, query)
    })
  }, [assetFilter, pets, query, sourceFilter])

  const summary = useMemo(
    () => ({
      total: pets.length,
      gems: pets.filter((pet) => pet.acquisition.kind === 'gems').length,
      premium: pets.filter((pet) => pet.acquisition.kind === 'premium').length,
      patron: pets.filter((pet) => pet.acquisition.kind === 'patron').length,
      unavailable: pets.filter((pet) => pet.acquisition.kind === 'not-yet-available').length,
      completeArt: pets.filter((pet) => pet.icon && pet.illustration).length,
    }),
    [pets],
  )

  return (
    <div className="page-shell pets-page">
      <SurfaceCard
        eyebrow={t({ zh: '官方 familiar definitions', en: 'Official familiar definitions' })}
        title={t({ zh: '宠物图鉴', en: 'Pet catalog' })}
        description={t({
          zh: '本页基于官方 `familiar_defines`、`premium_item_defines` 与 `patron_shop_item_defines` 归一化生成，并在构建期把宠物图标与 4x 立绘同步为站内静态资源。',
          en: 'This page is normalized from official familiar, premium item, and patron shop definitions, then syncs pet icons and 4x illustrations into local static assets at build time.',
        })}
        footer={
          <div className="pets-page__summary">
            <span>{t({ zh: `共 ${summary.total} 只宠物`, en: `${summary.total} pets` })}</span>
            <span>{t({ zh: `${summary.gems} 只宝石商店`, en: `${summary.gems} gem shop` })}</span>
            <span>{t({ zh: `${summary.premium} 只付费来源`, en: `${summary.premium} premium` })}</span>
            <span>{t({ zh: `${summary.patron} 只赞助商商店`, en: `${summary.patron} patron shop` })}</span>
            <span>{t({ zh: `${summary.unavailable} 只暂未开放`, en: `${summary.unavailable} unavailable` })}</span>
            <span>{t({ zh: `${summary.completeArt} 只有完整图像`, en: `${summary.completeArt} fully illustrated` })}</span>
          </div>
        }
      >
        <div className="pets-page__filters" aria-label={t({ zh: '宠物筛选', en: 'Pet filters' })}>
          <label className="field-label pets-page__search">
            <span>{t({ zh: '搜索', en: 'Search' })}</span>
            <input
              className="text-input"
              type="search"
              value={query}
              placeholder={t({ zh: '搜索宠物、描述或礼包名', en: 'Search pets, descriptions, or pack names' })}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="field-label">
            <span>{t({ zh: '来源', en: 'Source' })}</span>
            <select
              className="select-input"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            >
              <option value="all">{t({ zh: '全部来源', en: 'All sources' })}</option>
              <option value="gems">{t({ zh: '宝石商店', en: 'Gem shop' })}</option>
              <option value="premium">{t({ zh: '付费购买', en: 'Premium purchase' })}</option>
              <option value="patron">{t({ zh: '赞助商商店', en: 'Patron shop' })}</option>
              <option value="not-yet-available">{t({ zh: '暂未开放', en: 'Not yet available' })}</option>
              <option value="unknown">{t({ zh: '待确认', en: 'Unconfirmed' })}</option>
            </select>
          </label>

          <div className="field-label pets-page__asset-filter">
            <span>{t({ zh: '图像状态', en: 'Asset state' })}</span>
            <div className="segmented-control" role="group" aria-label={t({ zh: '图像状态', en: 'Asset state' })}>
              {[
                ['all', t({ zh: '全部', en: 'All' })],
                ['complete', t({ zh: '完整图像', en: 'Complete' })],
                ['missing', t({ zh: '缺图像', en: 'Missing art' })],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={assetFilter === value ? 'segmented-control__button segmented-control__button--active' : 'segmented-control__button'}
                  aria-pressed={assetFilter === value}
                  onClick={() => setAssetFilter(value as AssetFilter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {state.status === 'loading' ? (
          <StatusBanner
            tone="info"
            title={t({ zh: '正在加载宠物目录', en: 'Loading pet catalog' })}
            detail={t({
              zh: '正在读取本地版本化的宠物清单与静态图像。',
              en: 'Reading the local versioned pet manifest and static images.',
            })}
          />
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '宠物目录加载失败', en: 'Failed to load pet catalog' })}
            detail={
              state.message
                ? t({
                    zh: `无法读取 pets 数据：${state.message}`,
                    en: `Unable to read pets data: ${state.message}`,
                  })
                : t({
                    zh: '无法读取 pets 数据。',
                    en: 'Unable to read pets data.',
                  })
            }
          />
        ) : null}

        {state.status === 'ready' ? (
          filteredPets.length > 0 ? (
            <div className="pets-grid" aria-label={t({ zh: '宠物结果', en: 'Pet results' })}>
              {filteredPets.map((pet) => {
                const primaryName = getPrimaryLocalizedText(pet.name, locale)
                const secondaryName = getSecondaryLocalizedText(pet.name, locale)
                const primaryDescription = pet.description
                  ? getPrimaryLocalizedText(pet.description, locale)
                  : null
                const acquisitionLabel = buildAcquisitionLabel(pet.acquisition, locale)
                const acquisitionDetail = buildAcquisitionDetail(pet.acquisition, locale)
                const acquisitionNote = buildAcquisitionNote(pet.acquisition, locale)

                return (
                  <article key={pet.id} className="pet-card">
                    <div className="pet-card__stage">
                      <div className="pet-card__stage-grid" aria-hidden="true" />
                      {pet.illustration ? (
                        <img
                          className="pet-card__illustration"
                          src={resolveDataUrl(pet.illustration.path)}
                          alt={buildIllustrationAlt(pet, locale)}
                          loading="lazy"
                          width={pet.illustration.width}
                          height={pet.illustration.height}
                        />
                      ) : (
                        <div className="pet-card__stage-empty">
                          <strong>{t({ zh: '暂无立绘', en: 'No illustration yet' })}</strong>
                          <span>
                            {t({
                              zh: '当前 definitions 里没有可用的 XL 图像槽位。',
                              en: 'The current definitions do not expose a usable XL art slot yet.',
                            })}
                          </span>
                        </div>
                      )}

                      <div className="pet-card__icon-frame">
                        {pet.icon ? (
                          <img
                            className="pet-card__icon"
                            src={resolveDataUrl(pet.icon.path)}
                            alt={buildIconAlt(pet, locale)}
                            loading="lazy"
                            width={pet.icon.width}
                            height={pet.icon.height}
                          />
                        ) : (
                          <span className="pet-card__icon-fallback">?</span>
                        )}
                      </div>
                    </div>

                    <div className="pet-card__body">
                      <div className="pet-card__meta-row">
                        <span className="pet-card__source">{acquisitionLabel}</span>
                        <span className={pet.isAvailable ? 'pet-card__status' : 'pet-card__status pet-card__status--muted'}>
                          {buildStatusLabel(pet, locale)}
                        </span>
                      </div>

                      <h3 className="pet-card__title">{primaryName}</h3>
                      {secondaryName ? <p className="pet-card__secondary">{secondaryName}</p> : null}
                      {primaryDescription ? <p className="pet-card__description">{primaryDescription}</p> : null}

                      <div className="pet-card__acquisition">
                        <span className="pet-card__acquisition-label">{t({ zh: '获取方式', en: 'How to get' })}</span>
                        <strong className="pet-card__acquisition-detail">
                          {acquisitionDetail ?? t({ zh: '当前 definitions 没有给出稳定来源。', en: 'Current definitions do not expose a stable source.' })}
                        </strong>
                        {acquisitionNote ? <span className="pet-card__acquisition-note">{acquisitionNote}</span> : null}
                      </div>

                      <div className="pet-card__facts">
                        <span>
                          {pet.iconGraphicId
                            ? `icon #${pet.iconGraphicId}`
                            : t({ zh: 'icon 缺失', en: 'icon missing' })}
                        </span>
                        <span>
                          {pet.illustrationGraphicId
                            ? `xl #${pet.illustrationGraphicId}`
                            : t({ zh: 'xl 缺失', en: 'xl missing' })}
                        </span>
                        <span>{pet.acquisition.sourceType ?? t({ zh: '未标注 sourceType', en: 'No sourceType' })}</span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <StatusBanner
              tone="info"
              title={t({ zh: '没有匹配结果', en: 'No pets match' })}
              detail={t({
                zh: '当前筛选条件下没有宠物，试试清空搜索词或放宽图像状态。',
                en: 'No pets match the current filters. Try clearing the query or broadening the asset filter.',
              })}
            />
          )
        ) : null}
      </SurfaceCard>
    </div>
  )
}
