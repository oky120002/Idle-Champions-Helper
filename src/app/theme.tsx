/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const DEFAULT_PREFERENCE: ThemePreference = 'system'
const STORAGE_KEY = 'idle-champions-helper.theme'

interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function parseStoredPreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_PREFERENCE
}

function getThemeStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof window === 'undefined') {
    return null
  }

  // 部分隐私模式 / 禁用 cookie 时访问 localStorage 会抛 SecurityError；
  // 与 index.html FOUC 内联脚本同样降级为无存储（data-theme 由内联脚本兜底）。
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: Readonly<PropsWithChildren>) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    return parseStoredPreference(getThemeStorage()?.getItem(STORAGE_KEY) ?? null)
  })
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'light' : 'dark')
    }

    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    getThemeStorage()?.setItem(STORAGE_KEY, preference)

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = resolvedTheme
    }
  }, [preference, resolvedTheme])

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用')
  }

  return context
}
