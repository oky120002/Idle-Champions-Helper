import type { AppLocale } from '../app/i18n'
import { getPrimaryLocalizedText, getSecondaryLocalizedText } from '../domain/localizedText'
import type { Champion } from '../domain/types'
import { ChampionAvatar } from './ChampionAvatar'

interface ChampionIdentityProps {
  champion: Champion
  locale: AppLocale
  eyebrow: string
  avatarClassName?: string
}

export function ChampionIdentity({
  champion,
  locale,
  eyebrow,
  avatarClassName = 'champion-avatar--card',
}: ChampionIdentityProps) {
  const primaryName = getPrimaryLocalizedText(champion.name, locale)
  const secondaryName = getSecondaryLocalizedText(champion.name, locale)

  return (
    <>
      <div className="result-card__identity">
        <ChampionAvatar champion={champion} locale={locale} className={avatarClassName} />
        <div className="result-card__header">
          <span className="result-card__eyebrow">{eyebrow}</span>
          <h3 className="result-card__title">{primaryName}</h3>
        </div>
      </div>
      {secondaryName ? <p className="result-card__secondary">{secondaryName}</p> : null}
    </>
  )
}
