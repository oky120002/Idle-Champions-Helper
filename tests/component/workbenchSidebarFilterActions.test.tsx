import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { WorkbenchSidebarFilterActions } from '../../src/components/workbench/WorkbenchSidebarFilterActions'

describe('WorkbenchSidebarFilterActions', () => {
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
})
