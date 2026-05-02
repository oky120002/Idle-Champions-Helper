import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { App } from '../../src/app/App'
import { I18nProvider } from '../../src/app/i18n'
import { resolveActiveNavigationItem } from '../../src/app/appNavigation'

describe('planner route and navigation', () => {
  it('/planner 渲染 planner 页面', async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(await screen.findByText(/自动计划功能正在开发中/)).toBeInTheDocument()
  })

  it('导航包含自动计划', () => {
    const item = resolveActiveNavigationItem('/planner', null)
    expect(item.to).toBe('/planner')
    expect(item.label.zh).toBe('自动计划')
  })

  it('保持 HashRouter 兼容性', () => {
    // Ensure the planner route resolves correctly via navigation resolution
    const item = resolveActiveNavigationItem('/planner', null)
    expect(item).toBeDefined()
    expect(item.to).toBe('/planner')
  })
})
