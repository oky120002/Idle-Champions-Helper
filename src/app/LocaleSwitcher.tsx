import type { AppLocale } from './i18n'
import type { TranslationFn } from './appNavigation'

interface LocaleSwitcherProps {
  locale: AppLocale
  onSelect: (locale: AppLocale) => void
  t: TranslationFn
  surface: 'toolbar' | 'panel'
}

function buildCurrentLocaleLabel(locale: AppLocale) {
  return locale === 'zh-CN' ? '中文' : 'English'
}

function buildNextLocale(locale: AppLocale): AppLocale {
  return locale === 'zh-CN' ? 'en-US' : 'zh-CN'
}

function LocaleSwitcher({ locale, onSelect, t, surface }: LocaleSwitcherProps) {
  const nextLocale = buildNextLocale(locale)
  const isEnglish = locale === 'en-US'
  const switchLabel = t({ zh: '界面语言', en: 'Interface language' })
  const switchHint =
    locale === 'zh-CN'
      ? t({ zh: '切换到 English', en: 'Switch to English' })
      : t({ zh: '切换到 中文', en: 'Switch to Chinese' })

  return (
    <div className={`locale-switcher locale-switcher--${surface}`}>
      <div
        className="locale-switcher__controls"
        role="group"
        aria-label={t({ zh: '界面语言切换', en: 'Interface language switcher' })}
      >
        <button
          type="button"
          role="switch"
          className={
            isEnglish ? 'locale-switcher__toggle locale-switcher__toggle--english' : 'locale-switcher__toggle'
          }
          aria-checked={isEnglish}
          aria-label={switchLabel}
          title={switchHint}
          onClick={() => onSelect(nextLocale)}
        >
          <span className="locale-switcher__toggle-track" aria-hidden="true">
            <span className="locale-switcher__toggle-option locale-switcher__toggle-option--zh">中</span>
            <span className="locale-switcher__toggle-option locale-switcher__toggle-option--en">EN</span>
            <span className="locale-switcher__toggle-thumb" />
          </span>
          <span className="locale-switcher__toggle-copy">
            <span className="locale-switcher__toggle-label">
              {t({ zh: '界面语言', en: 'Interface language' })}
            </span>
            <strong className="locale-switcher__toggle-value">{buildCurrentLocaleLabel(locale)}</strong>
          </span>
        </button>
      </div>
    </div>
  )
}

interface ToolbarLocaleSwitcherProps {
  locale: AppLocale
  onSelect: (locale: AppLocale) => void
  t: TranslationFn
}

export function ToolbarLocaleSwitcher(props: ToolbarLocaleSwitcherProps) {
  return <LocaleSwitcher {...props} surface="toolbar" />
}

interface PanelLocaleSwitcherProps {
  locale: AppLocale
  onSelect: (locale: AppLocale) => void
  t: TranslationFn
}

export function PanelLocaleSwitcher(props: PanelLocaleSwitcherProps) {
  return <LocaleSwitcher {...props} surface="panel" />
}
