import { memo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { AppLocale } from '../../app/i18n'
import { resolveDataUrl } from '../../data/client'
import { formatSeatLabel, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import type { ChampionAnimation } from '../../domain/types'
import { SkelAnimCanvas } from '../../features/skelanim-player/SkelAnimCanvas'
import type { FilterableIllustration } from '../../rules/illustrationFilter'
import { buildIllustrationAlt, buildIllustrationCardTitle, buildKindLabel } from './illustration-model'
import type { IllustrationsPageTranslator } from './types'

type IllustrationResultCardProps = {
  entry: FilterableIllustration
  animation: ChampionAnimation | null
  locale: AppLocale
  t: IllustrationsPageTranslator
  onOpenChampion: () => void
}

function IllustrationResultCardInner({ entry, animation, locale, t, onOpenChampion }: IllustrationResultCardProps) {
  const location = useLocation()
  const { illustration, champion } = entry
  const [isPreviewActive, setPreviewActive] = useState(false)
  const [hasPreviewActivated, setHasPreviewActivated] = useState(false)
  const championPrimaryName = getPrimaryLocalizedText(illustration.championName, locale)
  const title = buildIllustrationCardTitle(illustration, locale)
  const fallbackSrc = resolveDataUrl(illustration.image.path)
  const shouldRenderPreview = Boolean(animation && hasPreviewActivated)

  const activatePreview = () => {
    setHasPreviewActivated(true)
    setPreviewActive(true)
  }

  return (
    <Link
      className="illustration-card illustration-card--interactive"
      to={`/champions/${illustration.championId}`}
      state={{
        activeNavigationTo: '/illustrations',
        returnTo: {
          pathname: '/illustrations',
          search: location.search,
        },
        returnLabel:
          locale === 'zh-CN'
            ? { zh: '返回立绘图鉴', en: 'Back to illustrations' }
            : { zh: '返回立绘图鉴', en: 'Back to illustrations' },
      }}
      aria-label={t({
        zh: `查看英雄：${championPrimaryName}（${title.primary}）`,
        en: `Open champion: ${championPrimaryName} (${title.primary})`,
      })}
      onMouseEnter={activatePreview}
      onMouseLeave={() => setPreviewActive(false)}
      onFocus={activatePreview}
      onBlur={() => setPreviewActive(false)}
      onClick={onOpenChampion}
    >
      <div className="illustration-card__image-shell">
        {shouldRenderPreview ? (
          <SkelAnimCanvas
            className="illustration-card__preview"
            animation={animation}
            fallbackSrc={fallbackSrc}
            alt={buildIllustrationAlt(illustration, locale)}
            viewportBounds={illustration.render.bounds}
            labels={{
              loading: t({ zh: '载入动图…', en: 'Loading motion…' }),
              play: t({ zh: '播放动画', en: 'Play animation' }),
              pause: t({ zh: '暂停动画', en: 'Pause animation' }),
              reducedMotion: t({ zh: '已遵循减少动态偏好', en: 'Reduced motion is active' }),
              error: t({ zh: '动态预览加载失败', en: 'Animated preview failed to load' }),
              animated: t({ zh: '动态预览已启用', en: 'Animated preview enabled' }),
              fallback: t({ zh: '当前显示静态立绘', en: 'Showing static illustration' }),
            }}
            playbackMode={isPreviewActive ? 'play' : 'pause'}
            sequenceIntent="walk"
            showLoadingBadge={false}
            showControls={false}
            showStatus={false}
          />
        ) : (
          <img
            className="illustration-card__image"
            src={fallbackSrc}
            alt={buildIllustrationAlt(illustration, locale)}
            loading="lazy"
            width={illustration.image.width}
            height={illustration.image.height}
          />
        )}
      </div>

      <div className="illustration-card__body">
        <h3 className="illustration-card__title" title={title.text}>
          <span className="illustration-card__title-primary">{title.primary}</span>
          {title.secondary ? (
            <>
              <span className="illustration-card__title-divider" aria-hidden="true">
                ·
              </span>
              <span className="illustration-card__title-context">{title.secondary}</span>
            </>
          ) : null}
        </h3>

        <div className="illustration-card__facts">
          <span className="illustration-card__fact illustration-card__fact--accent">
            {buildKindLabel(illustration.kind, locale)}
          </span>
          <span className="illustration-card__fact illustration-card__fact--accent">
            {formatSeatLabel(illustration.seat, locale)}
          </span>
          {champion?.roles.map((role) => (
            <span key={role} className="illustration-card__fact">
              {getRoleLabel(role, locale)}
            </span>
          ))}
        </div>

        {champion?.affiliations.length ? (
          <p className="illustration-card__supporting">
            {champion.affiliations.map((affiliation) => getPrimaryLocalizedText(affiliation, locale)).join(' / ')}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

export const IllustrationResultCard = memo(IllustrationResultCardInner)
