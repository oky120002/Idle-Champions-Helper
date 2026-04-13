import type { AppLocale } from '../app/i18n'
import { getLocalizedTextPair } from '../domain/localizedText'
import type { Champion } from '../domain/types'
import { ChampionAvatar } from './ChampionAvatar'

interface ChampionPillProps {
  champion: Champion
  locale: AppLocale
  label?: string
}

function buildDefaultLabel(champion: Champion, locale: AppLocale) {
  return locale === 'zh-CN'
    ? `${champion.seat} 号位 · ${getLocalizedTextPair(champion.name, locale)}`
    : `Seat ${champion.seat} · ${getLocalizedTextPair(champion.name, locale)}`
}

export function ChampionPill({ champion, locale, label }: ChampionPillProps) {
  return (
    <span className="champion-pill">
      <ChampionAvatar champion={champion} locale={locale} className="champion-avatar--pill" />
      <span className="champion-pill__label">{label ?? buildDefaultLabel(champion, locale)}</span>
    </span>
  )
}
