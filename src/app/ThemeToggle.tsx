import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme, type ThemePreference } from './theme'
import { useI18n, type LocaleText } from './i18n'

interface ThemeOption {
  value: ThemePreference
  label: LocaleText
  Icon: LucideIcon
}

const OPTIONS: ThemeOption[] = [
  { value: 'system', label: { zh: '跟随系统', en: 'System' }, Icon: Monitor },
  { value: 'dark', label: { zh: '深色', en: 'Dark' }, Icon: Moon },
  { value: 'light', label: { zh: '浅色', en: 'Light' }, Icon: Sun },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const { t } = useI18n()

  return (
    <div className="theme-toggle" role="radiogroup" aria-label={t({ zh: '主题切换', en: 'Theme' })}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={t(label)}
            title={t(label)}
            className={isActive ? 'theme-toggle__option theme-toggle__option--active' : 'theme-toggle__option'}
            onClick={() => setPreference(value)}
          >
            <Icon className="theme-toggle__icon" aria-hidden="true" strokeWidth={1.8} />
          </button>
        )
      })}
    </div>
  )
}
