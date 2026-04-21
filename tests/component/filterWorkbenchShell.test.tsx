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
        toolbarLead={<span>CHAMPIONS</span>}
        toolbarPrimary={<strong>英雄筛选</strong>}
        toolbarActions={<button type="button">随机排序</button>}
        sidebarHeader={<h3>筛选抽屉</h3>}
        sidebar={<label><span>搜索</span><input type="text" /></label>}
        contentHeader={<h2>结果总览</h2>}
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

  it('支持收起状态持久化，并在重新挂载后恢复为紧凑展开入口', async () => {
    const user = userEvent.setup()
    const storageKey = 'component-workbench-test'
    const persistenceKey = 'idle-champions-helper.filter-sidebar.component-workbench-test.collapsed'
    const view = renderFilterWorkbenchShell(storageKey)

    expect(screen.getByRole('heading', { level: 3, name: '筛选抽屉' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起筛选抽屉' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '随机排序' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '收起筛选抽屉' }))

    expect(screen.queryByRole('heading', { level: 3, name: '筛选抽屉' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开筛选抽屉' })).toBeInTheDocument()
    expect(window.localStorage.getItem(persistenceKey)).toBe('true')

    view.unmount()
    renderFilterWorkbenchShell(storageKey)

    expect(screen.queryByRole('heading', { level: 3, name: '筛选抽屉' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开筛选抽屉' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '随机排序' })).toBeInTheDocument()
  })
})
