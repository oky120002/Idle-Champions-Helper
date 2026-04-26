import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { FilterWorkbenchPage } from '../../src/components/workbench/FilterWorkbenchPage'

describe('FilterWorkbenchPage', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('根据配置自动渲染工具条 intro、按钮组和回顶按钮', async () => {
    const user = userEvent.setup()
    const onScrollToTop = vi.fn()
    const onClear = vi.fn()
    const onAction = vi.fn()

    render(
      <I18nProvider>
        <FilterWorkbenchPage
          pageClassName="component-filter-workbench"
          storageKey="filter-workbench"
          ariaLabel="筛选工作台"
          shellClassName="component-filter-workbench__shell"
          floatingTopButton={{ onClick: onScrollToTop }}
          toolbarIntro={{
            label: 'PETS',
            activeCount: 2,
            title: '宠物图鉴',
            detail: '筛选宠物并检查资源完整度',
          }}
          toolbarItems={[
            {
              id: 'badge',
              kind: 'badge',
              label: '24 项结果',
            },
            {
              id: 'action',
              label: '显示全部',
              onClick: onAction,
            },
          ]}
          sidebarHeader={{
            kicker: '筛选抽屉',
            title: '左侧缩小宠物目录',
            description: '先锁搜索词，再微调来源和资源状态。',
            statusLabel: '筛选状态操作',
            activeCount: 2,
            clearLabel: '清空全部',
            onClear,
          }}
          isReady
          sidebar={<div>筛选内容</div>}
          statusItems={[]}
        >
          <div>结果区域</div>
        </FilterWorkbenchPage>
      </I18nProvider>,
    )

    expect(screen.getByText('PETS')).toBeInTheDocument()
    expect(screen.getByText('2 项条件')).toBeInTheDocument()
    expect(screen.getByText('宠物图鉴')).toBeInTheDocument()
    expect(screen.queryByText('悬浮工作台')).not.toBeInTheDocument()
    expect(screen.getByText('24 项结果')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '显示全部' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回顶部' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '显示全部' }))
    await user.click(screen.getByRole('button', { name: '清空全部' }))
    await user.click(screen.getByRole('button', { name: '返回顶部' }))

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onScrollToTop).toHaveBeenCalledTimes(1)
  })
})
