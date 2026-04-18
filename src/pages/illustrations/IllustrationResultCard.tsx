import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AppLocale } from '../../app/i18n'
import { resolveDataUrl } from '../../data/client'
import { formatSeatLabel, getPrimaryLocalizedText, getRoleLabel, getSecondaryLocalizedText } from '../../domain/localizedText'
import type { ChampionAnimation } from '../../domain/types'
import { SkelAnimCanvas } from '../../features/skelanim-player/SkelAnimCanvas'
import type { FilterableIllustration } from '../../rules/illustrationFilter'
import { buildIllustrationAlt, buildKindLabel } from './illustration-model'
import type { IllustrationsPageTranslator } from './types'

type IllustrationResultCardProps = {
  entry: FilterableIllustration
  animation: ChampionAnimation | null
  locale: AppLocale
  t: IllustrationsPageTranslator
}

export function IllustrationResultCard({ entry, animation, locale, t }: IllustrationResultCardProps) {
  const { illustration, champion } = entry
  const [isPreviewActive, setPreviewActive] = useState(false)
  const championPrimaryName = getPrimaryLocalizedText(illustration.championName, locale)
  const illustrationPrimaryName = getPrimaryLocalizedText(illustration.illustrationName, locale)
  const illustrationSecondaryName = getSecondaryLocalizedText(illustration.illustrationName, locale)
  const fallbackSrc = resolveDataUrl(illustration.image.path)
  const titleText = illustrationSecondaryName
    ? `${illustrationPrimaryName} · ${illustrationSecondaryName}`
    : illustrationPrimaryName

  return (
    <Link
      className="illustration-card illustration-card--interactive"
      to={`/champions/${illustration.championId}`}
      aria-label={t({
        zh: `查看英雄：${championPrimaryName}（${illustrationPrimaryName}）`,
        en: `Open champion: ${championPrimaryName} (${illustrationPrimaryName})`,
      })}
      onMouseEnter={() => setPreviewActive(true)}
      onMouseLeave={() => setPreviewActive(false)}
      onFocus={() => setPreviewActive(true)}
      onBlur={() => setPreviewActive(false)}
    >
      <div className="illustration-card__image-shell">
        {animation && isPreviewActive ? (
          <SkelAnimCanvas
            className="illustration-card__preview"
            animation={animation}
            fallbackSrc={fallbackSrc}
            alt={buildIllustrationAlt(illustration, locale)}
            labels={{
              loading: t({ zh: '载入动图…', en: 'Loading motion…' }),
              play: t({ zh: '播放动画', en: 'Play animation' }),
              pause: t({ zh: '暂停动画', en: 'Pause animation' }),
              reducedMotion: t({ zh: '已遵循减少动态偏好', en: 'Reduced motion is active' }),
              error: t({ zh: '动态预览加载失败', en: 'Animated preview failed to load' }),
              animated: t({ zh: '动态预览已启用', en: 'Animated preview enabled' }),
              fallback: t({ zh: '当前显示静态立绘', en: 'Showing static illustration' }),
            }}
            playbackMode="play"
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
        <h3 className="illustration-card__title" title={titleText}>
          <span className="illustration-card__title-primary">{illustrationPrimaryName}</span>
          {illustrationSecondaryName ? (
            <span className="illustration-card__title-secondary">{illustrationSecondaryName}</span>
          ) : null}
        </h3>

        <p className="illustration-card__champion">{championPrimaryName}</p>

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
