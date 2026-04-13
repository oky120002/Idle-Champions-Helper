/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type AppLocale = 'zh-CN' | 'en-US'

export interface LocaleText {
  zh: string
  en: string
}

const DEFAULT_LOCALE: AppLocale = 'zh-CN'
const STORAGE_KEY = 'idle-champions-helper.locale'

interface I18nContextValue {
  locale: AppLocale
  isZh: boolean
  setLocale: (locale: AppLocale) => void
  t: (text: LocaleText) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function parseStoredLocale(value: string | null): AppLocale {
  return value === 'en-US' ? 'en-US' : DEFAULT_LOCALE
}

export function pickLocaleText(locale: AppLocale, text: LocaleText): string {
  return locale === 'zh-CN' ? text.zh : text.en
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<AppLocale>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LOCALE
    }

    return parseStoredLocale(window.localStorage.getItem(STORAGE_KEY))
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
    document.documentElement.dataset.uiLocale = locale
  }, [locale])

  const t = useCallback((text: LocaleText) => pickLocaleText(locale, text), [locale])

  const value = useMemo(
    () => ({
      locale,
      isZh: locale === 'zh-CN',
      setLocale,
      t,
    }),
    [locale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n 必须在 I18nProvider 内使用')
  }

  return context
}
