import { createElement, type ElementType } from 'react'
import { useI18n } from '../app/i18n'
import { getLocalizedTextPair, getPrimaryLocalizedText, getSecondaryLocalizedText } from '../domain/localizedText'
import type { LocalizedText as LocalizedTextValue } from '../domain/types'

export type LocalizedTextMode = 'primary' | 'pair' | 'stacked'

interface LocalizedTextProps {
  text: LocalizedTextValue
  mode?: LocalizedTextMode
  as?: ElementType
  className?: string
  primaryAs?: ElementType
  primaryClassName?: string
  secondaryAs?: ElementType
  secondaryClassName?: string
  separator?: string
}

export function LocalizedText({
  text,
  mode = 'pair',
  as,
  className,
  primaryAs = 'span',
  primaryClassName,
  secondaryAs = 'span',
  secondaryClassName,
  separator = ' · ',
}: LocalizedTextProps) {
  const { locale } = useI18n()
  const wrapperTag = as ?? (mode === 'stacked' ? 'div' : 'span')
  const primary = getPrimaryLocalizedText(text, locale)
  const secondary = getSecondaryLocalizedText(text, locale)

  if (mode === 'primary') {
    return createElement(wrapperTag, { className }, primary)
  }

  if (mode === 'pair') {
    return createElement(wrapperTag, { className }, getLocalizedTextPair(text, locale, separator))
  }

  return createElement(wrapperTag, { className }, [
    createElement(primaryAs, { key: 'primary', className: primaryClassName }, primary),
    secondary
      ? createElement(secondaryAs, { key: 'secondary', className: secondaryClassName }, secondary)
      : null,
  ])
}
