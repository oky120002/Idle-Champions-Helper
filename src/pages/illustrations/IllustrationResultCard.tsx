import { Link } from 'react-router-dom'
import type { AppLocale } from '../../app/i18n'
import { resolveDataUrl } from '../../data/client'
import { formatSeatLabel, getPrimaryLocalizedText, getRoleLabel, getSecondaryLocalizedText } from '../../domain/localizedText'
import type { IllustrationsPageTranslator } from './types'
import type { FilterableIllustration } from '../../rules/illustrationFilter'
import { buildIllustrationAlt, buildKindLabel, buildSourceSlotLabel } from './illustration-model'

type IllustrationResultCardProps = {
  entry: FilterableIllustration
  locale: AppLocale
  t: IllustrationsPageTranslator
}

export function IllustrationResultCard({ entry, locale, t }: IllustrationResultCardProps) {
  const { illustration, champion } = entry
  const championPrimaryName = getPrimaryLocalizedText(illustration.championName, locale)
  const championSecondaryName = getSecondaryLocalizedText(illustration.championName, locale)
  const illustrationPrimaryName = getPrimaryLocalizedText(illustration.illustrationName, locale)
  const illustrationSecondaryName = getSecondaryLocalizedText(illustration.illustrationName, locale)

  return (
    <article className="illustration-card">
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
          <span className="illustration-card__seat">{formatSeatLabel(illustration.seat, locale)}</span>
        </div>

        <h3 className="illustration-card__title">{illustrationPrimaryName}</h3>
        {illustrationSecondaryName ? <p className="illustration-card__secondary">{illustrationSecondaryName}</p> : null}

        <p className="illustration-card__champion">
          {t({ zh: '所属英雄', en: 'Champion' })} · {championPrimaryName}
        </p>
        {championSecondaryName ? (
          <p className="illustration-card__champion illustration-card__champion--muted">{championSecondaryName}</p>
        ) : null}

        {champion?.roles.length ? (
          <div className="tag-row tag-row--tight">
            {champion.roles.map((role) => (
              <span key={role} className="tag-pill tag-pill--muted">
                {getRoleLabel(role, locale)}
              </span>
            ))}
          </div>
        ) : null}

        {champion?.affiliations.length ? (
          <p className="illustration-card__supporting">
            {t({ zh: '联动队伍', en: 'Affiliation' })} ·{' '}
            {champion.affiliations.map((affiliation) => getPrimaryLocalizedText(affiliation, locale)).join(' / ')}
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
}
