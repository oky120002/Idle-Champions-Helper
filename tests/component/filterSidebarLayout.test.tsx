import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { FilterSidebarLayout } from '../../src/components/filter-sidebar/FilterSidebarLayout'
import { FilterSidebarPanel } from '../../src/components/filter-sidebar/FilterSidebarPanel'

function renderFilterSidebarLayout(storageKey: string) {
  return render(
    <I18nProvider>
      <FilterSidebarLayout
        storageKey={storageKey}
        sidebar={(
          <FilterSidebarPanel title="测试筛选" titleAs="h3">
            <label>
              搜索
              <input type="text" />
            </label>
          </FilterSidebarPanel>
        )}
      >
        <section aria-label="测试结果">结果区域</section>
      </FilterSidebarLayout>
    </I18nProvider>,
  )
}

describe('FilterSidebarLayout', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('支持收起后持久化，并在重新挂载时恢复状态', async () => {
    const user = userEvent.setup()
    const storageKey = 'component-test'
    const persistenceKey = 'idle-champions-helper.filter-sidebar.component-test.collapsed'
    const view = renderFilterSidebarLayout(storageKey)

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起筛选栏' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '收起筛选栏' }))

    expect(screen.queryByRole('heading', { level: 3, name: '测试筛选' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开筛选栏' })).toBeInTheDocument()
    expect(window.localStorage.getItem(persistenceKey)).toBe('true')

    view.unmount()
    renderFilterSidebarLayout(storageKey)

    expect(screen.queryByRole('heading', { level: 3, name: '测试筛选' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开筛选栏' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '展开筛选栏' }))

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(window.localStorage.getItem(persistenceKey)).toBe('false')
  })

  it('不同 storageKey 的侧栏收起状态互不串页', async () => {
    const user = userEvent.setup()

    const firstView = renderFilterSidebarLayout('page-a')
    await user.click(screen.getByRole('button', { name: '收起筛选栏' }))
    firstView.unmount()

    renderFilterSidebarLayout('page-b')

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起筛选栏' })).toBeInTheDocument()
  })
})
