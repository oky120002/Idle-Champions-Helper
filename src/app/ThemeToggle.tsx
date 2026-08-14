import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTheme, type ThemePreference } from './theme'
import { useI18n, type MessageRef } from './i18n'

interface ThemeOption {
  value: ThemePreference
  label: MessageRef
  Icon: LucideIcon
}

const OPTIONS: ThemeOption[] = [
  { value: 'system', label: { key: '跟随系统' }, Icon: Monitor },
  { value: 'dark', label: { key: '深色' }, Icon: Moon },
  { value: 'light', label: { key: '浅色' }, Icon: Sun },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const { t } = useI18n()

  return (
    <div className="theme-toggle" role="radiogroup" aria-label={t("主题切换")}>
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
