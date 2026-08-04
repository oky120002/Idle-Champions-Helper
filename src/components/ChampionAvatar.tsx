import type { AppLocale } from '../app/i18n'
import { resolveDataUrl } from '../data/client'
import { getPrimaryLocalizedText } from '../domain/localizedText'
import type { Champion } from '../domain/types'

interface ChampionAvatarProps {
  readonly champion: Champion
  readonly locale: AppLocale
  readonly className?: string
  readonly loading?: 'eager' | 'lazy'
}

function buildAvatarAlt(champion: Champion, locale: AppLocale) {
  const primaryName = getPrimaryLocalizedText(champion.name, locale)
  return locale === 'zh-CN' ? `${primaryName}头像` : `${primaryName} portrait`
}

function buildClassName(className?: string) {
  return className !== undefined && className !== '' ? `champion-avatar ${className}` : 'champion-avatar'
}

export function ChampionAvatar({
  champion,
  locale,
  className,
  loading = 'lazy',
}: ChampionAvatarProps) {
  const path = champion.portrait?.path
  if (path === undefined || path === '') {
    return (
      <span className={`${buildClassName(className)} champion-avatar--fallback`} aria-hidden="true">
        {getPrimaryLocalizedText(champion.name, locale).slice(0, 1).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      className={buildClassName(className)}
      src={resolveDataUrl(path)}
      alt={buildAvatarAlt(champion, locale)}
      loading={loading}
      width={256}
      height={256}
    />
  )
}
