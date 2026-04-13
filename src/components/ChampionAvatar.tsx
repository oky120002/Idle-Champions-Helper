import type { AppLocale } from '../app/i18n'
import { resolveDataUrl } from '../data/client'
import { getPrimaryLocalizedText } from '../domain/localizedText'
import type { Champion } from '../domain/types'

interface ChampionAvatarProps {
  champion: Champion
  locale: AppLocale
  className?: string
  loading?: 'eager' | 'lazy'
}

function buildAvatarAlt(champion: Champion, locale: AppLocale) {
  const primaryName = getPrimaryLocalizedText(champion.name, locale)
  return locale === 'zh-CN' ? `${primaryName}头像` : `${primaryName} portrait`
}

function buildClassName(className?: string) {
  return className ? `champion-avatar ${className}` : 'champion-avatar'
}

export function ChampionAvatar({
  champion,
  locale,
  className,
  loading = 'lazy',
}: ChampionAvatarProps) {
  if (!champion.portrait?.path) {
    return (
      <span className={`${buildClassName(className)} champion-avatar--fallback`} aria-hidden="true">
        {getPrimaryLocalizedText(champion.name, locale).slice(0, 1).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      className={buildClassName(className)}
      src={resolveDataUrl(champion.portrait.path)}
      alt={buildAvatarAlt(champion, locale)}
      loading={loading}
      width={256}
      height={256}
    />
  )
}
