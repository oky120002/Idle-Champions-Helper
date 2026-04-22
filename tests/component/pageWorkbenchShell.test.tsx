import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { PageWorkbenchShell } from '../../src/components/workbench/PageWorkbenchShell'

function renderPageWorkbenchShell(storageKey: string) {
  return render(
    <I18nProvider>
      <PageWorkbenchShell
        storageKey={storageKey}
        ariaLabel="测试工作台"
        toolbarLead={<span>左侧标记</span>}
        toolbarPrimary={<span>主工具栏</span>}
        sidebarHeader={<h3>测试筛选</h3>}
        sidebar={<label>搜索<input type="text" /></label>}
      >
        <section aria-label="测试结果">结果区域</section>
      </PageWorkbenchShell>
    </I18nProvider>,
  )
}

describe('PageWorkbenchShell', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('支持收起后持久化，并在重新挂载时恢复状态', async () => {
    const user = userEvent.setup()
    const storageKey = 'component-test'
    const persistenceKey = 'idle-champions-helper.workbench.component-test.collapsed'
    const view = renderPageWorkbenchShell(storageKey)

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起左侧面板' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '收起左侧面板' }))

    expect(screen.queryByRole('heading', { level: 3, name: '测试筛选' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开左侧面板' })).toBeInTheDocument()
    expect(window.localStorage.getItem(persistenceKey)).toBe('true')

    view.unmount()
    renderPageWorkbenchShell(storageKey)

    expect(screen.queryByRole('heading', { level: 3, name: '测试筛选' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '展开左侧面板' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '展开左侧面板' }))

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(window.localStorage.getItem(persistenceKey)).toBe('false')
  })

  it('不同 storageKey 的抽屉收起状态互不串页', async () => {
    const user = userEvent.setup()

    const firstView = renderPageWorkbenchShell('page-a')
    await user.click(screen.getByRole('button', { name: '收起左侧面板' }))
    firstView.unmount()

    renderPageWorkbenchShell('page-b')

    expect(screen.getByRole('heading', { level: 3, name: '测试筛选' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起左侧面板' })).toBeInTheDocument()
  })

  it('无左栏模式不渲染抽屉开关，也不保留隐藏轨道', () => {
    render(
      <I18nProvider>
        <PageWorkbenchShell
          storageKey="sidebarless"
          ariaLabel="无左栏工作台"
          toolbarLead={<span>返回</span>}
          toolbarPrimary={<span>详情主工具栏</span>}
        >
          <section>详情内容</section>
        </PageWorkbenchShell>
      </I18nProvider>,
    )

    expect(screen.queryByRole('button', { name: /左侧面板/ })).not.toBeInTheDocument()
    expect(document.querySelector('.page-workbench--sidebarless')).not.toBeNull()
    expect(document.querySelector('.page-workbench__sidebar')).toBeNull()
  })
})
