import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// 全套件并发负载下 waitFor 默认 1000ms 偶发超时；放宽到 5000ms 稳定异步断言（不削弱断言本身）。
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
  if (typeof window.localStorage.clear === 'function') {
    window.localStorage.clear()
  }
  document.documentElement.removeAttribute('lang')
  delete document.documentElement.dataset.uiLocale
})
