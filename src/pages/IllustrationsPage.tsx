import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../app/i18n'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection, resolveDataUrl } from '../data/client'
import { getPrimaryLocalizedText, getSecondaryLocalizedText } from '../domain/localizedText'
import type { ChampionIllustration, ChampionIllustrationKind } from '../domain/types'

type ViewFilter = 'all' | ChampionIllustrationKind

type IllustrationState =
  | { status: 'loading' }
  | { status: 'ready'; illustrations: ChampionIllustration[] }
  | { status: 'error'; message: string }

const seatOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const EMPTY_ILLUSTRATIONS: ChampionIllustration[] = []

function buildIllustrationAlt(illustration: ChampionIllustration, locale: 'zh-CN' | 'en-US') {
  const championName = getPrimaryLocalizedText(illustration.championName, locale)
  const illustrationName = getPrimaryLocalizedText(illustration.illustrationName, locale)

  if (illustration.kind === 'hero-base') {
    return locale === 'zh-CN' ? `${championName}本体立绘` : `${championName} base illustration`
  }

  return locale === 'zh-CN'
    ? `${championName}${illustrationName}皮肤立绘`
    : `${championName} ${illustrationName} skin illustration`
}

function buildKindLabel(kind: ChampionIllustrationKind, locale: 'zh-CN' | 'en-US') {
  if (kind === 'hero-base') {
    return locale === 'zh-CN' ? '英雄本体' : 'Hero base'
  }

  return locale === 'zh-CN' ? '皮肤立绘' : 'Skin illustration'
}

function buildSourceSlotLabel(slot: ChampionIllustration['sourceSlot'], locale: 'zh-CN' | 'en-US') {
  if (slot === 'large') {
    return locale === 'zh-CN' ? '来源 large 槽位' : 'Source: large slot'
  }

  if (slot === 'xl') {
    return locale === 'zh-CN' ? '来源 xl 槽位' : 'Source: xl slot'
  }

  return locale === 'zh-CN' ? '来源 base 槽位' : 'Source: base slot'
}

export function IllustrationsPage() {
  const { locale, t } = useI18n()
  const [state, setState] = useState<IllustrationState>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [seatFilter, setSeatFilter] = useState<number | 'all'>('all')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')

  useEffect(() => {
    let disposed = false

    loadCollection<ChampionIllustration>('champion-illustrations')
      .then((collection) => {
        if (disposed) {
          return
        }

        setState({ status: 'ready', illustrations: collection.items })
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

  const illustrations = state.status === 'ready' ? state.illustrations : EMPTY_ILLUSTRATIONS
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredIllustrations = useMemo(() => {
    return illustrations.filter((illustration) => {
      if (seatFilter !== 'all' && illustration.seat !== seatFilter) {
        return false
      }

      if (viewFilter !== 'all' && illustration.kind !== viewFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const haystack = [
        illustration.championName.display,
        illustration.championName.original,
        illustration.illustrationName.display,
        illustration.illustrationName.original,
      ]
        .join(' ')
        .toLocaleLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [illustrations, normalizedQuery, seatFilter, viewFilter])
  const heroCount = illustrations.filter((illustration) => illustration.kind === 'hero-base').length
  const skinCount = illustrations.length - heroCount

  return (
    <div className="page-shell illustrations-page">
      <SurfaceCard
        eyebrow={t({ zh: '本地静态资源', en: 'Local static assets' })}
        title={t({ zh: '英雄立绘页', en: 'Champion illustrations' })}
        description={t({
          zh: '本页只消费站内版本化立绘资源，不依赖浏览器运行时跨域抓官方图片。这样在 GitHub Pages 上也能稳定显示全部英雄本体立绘和皮肤立绘。',
          en: 'This page only consumes versioned local illustration assets, so GitHub Pages can render the full hero and skin catalog without runtime cross-origin fetches.',
        })}
        footer={
          <div className="illustrations-page__summary">
            <span>{t({ zh: `共 ${illustrations.length} 张立绘`, en: `${illustrations.length} illustrations` })}</span>
            <span>{t({ zh: `${heroCount} 张本体`, en: `${heroCount} hero base` })}</span>
            <span>{t({ zh: `${skinCount} 张皮肤`, en: `${skinCount} skins` })}</span>
          </div>
        }
      >
        <div className="illustrations-page__filters" aria-label={t({ zh: '立绘筛选', en: 'Illustration filters' })}>
          <label className="field-label illustrations-page__search">
            <span>{t({ zh: '搜索', en: 'Search' })}</span>
            <input
              className="text-input"
              type="search"
              value={query}
              placeholder={t({ zh: '搜索英雄或皮肤名', en: 'Search champions or skins' })}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="field-label">
            <span>{t({ zh: 'Seat', en: 'Seat' })}</span>
            <select
              className="select-input"
              value={seatFilter}
              onChange={(event) => {
                const value = event.target.value
                setSeatFilter(value === 'all' ? 'all' : Number(value))
              }}
            >
              <option value="all">{t({ zh: '全部 seat', en: 'All seats' })}</option>
              {seatOptions.map((seat) => (
                <option key={seat} value={seat}>
                  {locale === 'zh-CN' ? `${seat} 号位` : `Seat ${seat}`}
                </option>
              ))}
            </select>
          </label>

          <div className="field-label illustrations-page__view-filter">
            <span>{t({ zh: '范围', en: 'Scope' })}</span>
            <div className="segmented-control" role="group" aria-label={t({ zh: '立绘范围', en: 'Illustration scope' })}>
              {[
                ['all', t({ zh: '全部', en: 'All' })],
                ['hero-base', t({ zh: '本体', en: 'Heroes' })],
                ['skin', t({ zh: '皮肤', en: 'Skins' })],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={viewFilter === value ? 'segmented-control__button segmented-control__button--active' : 'segmented-control__button'}
                  aria-pressed={viewFilter === value}
                  onClick={() => setViewFilter(value as ViewFilter)}
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
            title={t({ zh: '正在加载立绘目录', en: 'Loading illustration catalog' })}
            detail={t({
              zh: '正在读取本地版本化立绘清单。',
              en: 'Reading the local versioned illustration manifest.',
            })}
          />
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '立绘目录加载失败', en: 'Failed to load illustration catalog' })}
            detail={
              state.message
                ? t({
                    zh: `无法读取 champion-illustrations 数据：${state.message}`,
                    en: `Unable to read champion-illustrations data: ${state.message}`,
                  })
                : t({
                    zh: '无法读取 champion-illustrations 数据。',
                    en: 'Unable to read champion-illustrations data.',
                  })
            }
          />
        ) : null}

        {state.status === 'ready' ? (
          filteredIllustrations.length > 0 ? (
            <div className="illustrations-grid" aria-label={t({ zh: '立绘结果', en: 'Illustration results' })}>
              {filteredIllustrations.map((illustration) => {
                const championPrimaryName = getPrimaryLocalizedText(illustration.championName, locale)
                const championSecondaryName = getSecondaryLocalizedText(illustration.championName, locale)
                const illustrationPrimaryName = getPrimaryLocalizedText(illustration.illustrationName, locale)
                const illustrationSecondaryName = getSecondaryLocalizedText(illustration.illustrationName, locale)

                return (
                  <article key={illustration.id} className="illustration-card">
                    <div className="illustration-card__image-shell">
                      <img
                        className="illustration-card__image"
                        src={resolveDataUrl(illustration.image.path)}
                        alt={buildIllustrationAlt(illustration, locale)}
                        loading="lazy"
                        width={illustration.image.width}
                        height={illustration.image.height}
                      />
                    </div>

                    <div className="illustration-card__body">
                      <div className="illustration-card__meta-row">
                        <span className="illustration-card__kind">{buildKindLabel(illustration.kind, locale)}</span>
                        <span className="illustration-card__seat">
                          {locale === 'zh-CN' ? `${illustration.seat} 号位` : `Seat ${illustration.seat}`}
                        </span>
                      </div>

                      <h3 className="illustration-card__title">{illustrationPrimaryName}</h3>
                      {illustrationSecondaryName ? (
                        <p className="illustration-card__secondary">{illustrationSecondaryName}</p>
                      ) : null}

                      <p className="illustration-card__champion">
                        {t({ zh: '所属英雄', en: 'Champion' })} · {championPrimaryName}
                      </p>
                      {championSecondaryName ? (
                        <p className="illustration-card__champion illustration-card__champion--muted">
                          {championSecondaryName}
                        </p>
                      ) : null}

                      <div className="illustration-card__facts">
                        <span>{buildSourceSlotLabel(illustration.sourceSlot, locale)}</span>
                        <span>{`graphic #${illustration.sourceGraphicId}`}</span>
                        <span>{`${illustration.image.width} × ${illustration.image.height}`}</span>
                      </div>

                      <div className="illustration-card__actions">
                        <Link className="action-button action-button--ghost" to={`/champions/${illustration.championId}`}>
                          {t({ zh: '查看英雄详情', en: 'Open champion detail' })}
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <StatusBanner
              tone="info"
              title={t({ zh: '没有匹配结果', en: 'No illustrations match' })}
              detail={t({
                zh: '当前筛选条件下没有可展示的立绘，试试清空搜索词或放宽范围。',
                en: 'No illustrations match the current filters. Try clearing the query or broadening the scope.',
              })}
            />
          )
        ) : null}
      </SurfaceCard>
    </div>
  )
}
