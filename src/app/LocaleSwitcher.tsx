import type { AppLocale } from './i18n'
import { localeOptions, type TranslationFn } from './appNavigation'

interface LocaleSwitcherButtonsProps {
  locale: AppLocale
  onSelect: (locale: AppLocale) => void
  surface: 'toolbar' | 'panel'
}

function LocaleSwitcherButtons({ locale, onSelect, surface }: LocaleSwitcherButtonsProps) {
  return localeOptions.map((option) => (
    <button
      key={`${surface}-${option.id}`}
      type="button"
      className={
        locale === option.id ? 'locale-switcher__button locale-switcher__button--active' : 'locale-switcher__button'
      }
      aria-pressed={locale === option.id}
      onClick={() => onSelect(option.id)}
    >
      <span className="locale-switcher__button-title">{option.title}</span>
      <span className="locale-switcher__button-short" aria-hidden="true">
        {option.shortLabel}
      </span>
    </button>
  ))
}

interface ToolbarLocaleSwitcherProps {
  locale: AppLocale
  onSelect: (locale: AppLocale) => void
  t: TranslationFn
}

export function ToolbarLocaleSwitcher({ locale, onSelect, t }: ToolbarLocaleSwitcherProps) {
  return (
    <div className="locale-switcher locale-switcher--toolbar">
      <div
        className="locale-switcher__controls"
        role="group"
        aria-label={t({ zh: '界面语言切换', en: 'Interface language switcher' })}
      >
        <LocaleSwitcherButtons locale={locale} onSelect={onSelect} surface="toolbar" />
      </div>
    </div>
  )
}

interface PanelLocaleSwitcherProps {
  locale: AppLocale
  onSelect: (locale: AppLocale) => void
  t: TranslationFn
}

export function PanelLocaleSwitcher({ locale, onSelect, t }: PanelLocaleSwitcherProps) {
  return (
    <div className="locale-switcher locale-switcher--panel">
      <div
        className="locale-switcher__controls"
        role="group"
        aria-label={t({ zh: '界面语言切换', en: 'Interface language switcher' })}
      >
        <LocaleSwitcherButtons locale={locale} onSelect={onSelect} surface="panel" />
      </div>
    </div>
  )
}
