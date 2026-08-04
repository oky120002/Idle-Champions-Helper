import type { ReactNode } from 'react'
import type { AppLocale } from '../app/i18n'
import { getPrimaryLocalizedText, getSecondaryLocalizedText } from '../domain/localizedText'
import type { Champion } from '../domain/types'
import { ChampionAvatar } from './ChampionAvatar'

interface ChampionIdentityProps {
  readonly champion: Champion
  readonly locale: AppLocale
  readonly eyebrow: string
  readonly avatarClassName?: string
  readonly supporting?: ReactNode
  readonly variant?: 'default' | 'spotlight'
}

export function ChampionIdentity({
  champion,
  locale,
  eyebrow,
  avatarClassName = 'champion-avatar--card',
  supporting,
  variant = 'default',
}: ChampionIdentityProps) {
  const primaryName = getPrimaryLocalizedText(champion.name, locale)
  const secondaryName = getSecondaryLocalizedText(champion.name, locale)

  if (variant === 'spotlight') {
    return (
      <div className="result-card__identity result-card__identity--spotlight">
        <div className="result-card__portrait-stage">
          <span className="result-card__portrait-frame">
            <ChampionAvatar champion={champion} locale={locale} className={avatarClassName} />
          </span>
        </div>

        <div className="result-card__header result-card__header--spotlight">
          <h3 className="result-card__title result-card__title--paired">
            <span className="result-card__title-primary">{primaryName}</span>
            {secondaryName !== null && secondaryName !== '' ? <span className="result-card__secondary">{secondaryName}</span> : null}
          </h3>
          <div
            className={
              supporting !== null && supporting !== undefined
                ? 'result-card__supporting-slot'
                : 'result-card__supporting-slot result-card__supporting-slot--empty'
            }
            aria-hidden={supporting !== null && supporting !== undefined ? undefined : true}
          >
            {supporting ?? <p className="result-card__affiliation">placeholder</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="result-card__identity">
        <ChampionAvatar champion={champion} locale={locale} className={avatarClassName} />
        <div className="result-card__header">
          <span className="result-card__eyebrow">{eyebrow}</span>
          <h3 className="result-card__title">{primaryName}</h3>
        </div>
      </div>
      {secondaryName !== null && secondaryName !== '' ? <p className="result-card__secondary">{secondaryName}</p> : null}
      {supporting !== null && supporting !== undefined ? <div className="result-card__supporting-slot">{supporting}</div> : null}
    </>
  )
}
