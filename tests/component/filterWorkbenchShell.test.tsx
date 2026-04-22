import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { FilterWorkbenchShell } from '../../src/components/filter-sidebar/FilterWorkbenchShell'

function renderFilterWorkbenchShell(storageKey: string) {
  return render(
    <I18nProvider>
      <FilterWorkbenchShell
        storageKey={storageKey}
        ariaLabel="测试工作台"
        toolbarLead={<span>左侧标记</span>}
        toolbarPrimary={<span>主工具栏</span>}
        sidebarHeader={<h3>测试筛选</h3>}
        sidebar={<label>搜索<input type="text" /></label>}
      >
        <section aria-label="测试结果">结果区域</section>
      </FilterWorkbenchShell>
    </I18nProvider>,
  )
}

describe('FilterWorkbenchShell', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('支持收起后持久化，并在重新挂载时恢复状态', async () => {
    const user = userEvent.setup()
    const storageKey = 'component-test'
    const persistenceKey = 'idle-champions-helper.filter-sidebar.component-test.collapsed'
    const view = renderFilterWorkbenchShell(storageKey)

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起筛选抽屉' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '收起筛选抽屉' }))

    expect(screen.queryByRole('heading', { level: 3, name: '测试筛选' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开筛选抽屉' })).toBeInTheDocument()
    expect(window.localStorage.getItem(persistenceKey)).toBe('true')

    view.unmount()
    renderFilterWorkbenchShell(storageKey)

    expect(screen.queryByRole('heading', { level: 3, name: '测试筛选' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开筛选抽屉' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '展开筛选抽屉' }))

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(window.localStorage.getItem(persistenceKey)).toBe('false')
  })

  it('不同 storageKey 的抽屉收起状态互不串页', async () => {
    const user = userEvent.setup()

    const firstView = renderFilterWorkbenchShell('page-a')
    await user.click(screen.getByRole('button', { name: '收起筛选抽屉' }))
    firstView.unmount()

    renderFilterWorkbenchShell('page-b')

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起筛选抽屉' })).toBeInTheDocument()
  })
})
