import type { RefObject } from 'react'
import type { AppLocale } from './i18n'
import { DisclosureCaretIcon } from './AppIcons'
import { localeOptions, type LocaleOption, type TranslationFn } from './appNavigation'

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
  activeLocaleOption: LocaleOption
  isOpen: boolean
  locale: AppLocale
  localeSwitcherRef: RefObject<HTMLDivElement | null>
  onSelect: (locale: AppLocale) => void
  onToggle: () => void
  t: TranslationFn
}

export function ToolbarLocaleSwitcher({
  activeLocaleOption,
  isOpen,
  locale,
  localeSwitcherRef,
  onSelect,
  onToggle,
  t,
}: ToolbarLocaleSwitcherProps) {
  return (
    <div
      ref={localeSwitcherRef}
      className={isOpen ? 'locale-switcher locale-switcher--toolbar locale-switcher--open' : 'locale-switcher locale-switcher--toolbar'}
    >
      <button
        type="button"
        className="locale-switcher__trigger"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t({
          zh: `界面语言，当前${activeLocaleOption.title}`,
          en: `Interface language, current ${activeLocaleOption.title}`,
        })}
        onClick={onToggle}
      >
        <span className="locale-switcher__trigger-copy">
          <span className="locale-switcher__trigger-label">{t({ zh: '界面语言', en: 'Locale' })}</span>
          <strong className="locale-switcher__trigger-value">{activeLocaleOption.title}</strong>
        </span>
        <span className="locale-switcher__trigger-icon">
          <DisclosureCaretIcon isOpen={isOpen} />
        </span>
      </button>
      {isOpen ? (
        <div
          className="locale-switcher__controls"
          role="group"
          aria-label={t({ zh: '界面语言切换', en: 'Interface language switcher' })}
        >
          <LocaleSwitcherButtons
            locale={locale}
            onSelect={(nextLocale) => {
              onSelect(nextLocale)
            }}
            surface="toolbar"
          />
        </div>
      ) : null}
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
