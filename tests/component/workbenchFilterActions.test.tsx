import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import {
  WorkbenchSidebarFilterActions,
  createWorkbenchResultVisibilityItem,
  createWorkbenchShuffleItem,
} from '../../src/components/workbench/WorkbenchFilterActions'

const t = ({ zh }: { zh: string; en: string }) => zh

describe('WorkbenchFilterActions', () => {
  it('在存在激活条件时渲染清空按钮', async () => {
    const handleClear = vi.fn()

    render(
      <I18nProvider>
        <WorkbenchSidebarFilterActions
          activeCount={2}
          clearLabel="清空全部"
          onClear={handleClear}
        />
      </I18nProvider>,
    )

    const clearButton = screen.getByRole('button', { name: '清空全部' })

    expect(screen.getByText('2 项已启用')).toBeInTheDocument()
    clearButton.click()
    expect(handleClear).toHaveBeenCalledTimes(1)
  })

  it('生成结果展开按钮配置', () => {
    expect(
      createWorkbenchResultVisibilityItem({
        t,
        defaultVisibleCount: 50,
        filteredCount: 62,
        showAllResults: false,
        canToggle: true,
        isReady: true,
        onClick: vi.fn(),
      }),
    ).toMatchObject({
      id: 'toggle-visibility',
      label: '显示全部 62（默认 50）',
      hidden: false,
      isActive: false,
      ariaPressed: false,
      variant: 'prominent',
    })
  })

  it('生成重新随机按钮配置', () => {
    expect(
      createWorkbenchShuffleItem({
        t,
        resultCount: 10,
        hasRandomOrder: true,
        isReady: true,
        onClick: vi.fn(),
      }),
    ).toMatchObject({
      id: 'shuffle-results',
      label: '重新随机',
      hidden: false,
      isActive: true,
    })
  })
})
