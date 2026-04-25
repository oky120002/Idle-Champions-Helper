import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { ConfiguredWorkbenchMetricsHeader } from '../../src/components/workbench/ConfiguredWorkbenchMetricsHeader'

describe('ConfiguredWorkbenchMetricsHeader', () => {
  it('在提供 active filters 时自动补当前筛选前缀', () => {
    render(
      <I18nProvider>
        <ConfiguredWorkbenchMetricsHeader
          items={[
            {
              label: '当前展示',
              value: '12 / 24',
            },
          ]}
          activeFilters={['座位：1 号位', '定位：辅助']}
        />
      </I18nProvider>,
    )

    expect(screen.getByText('当前筛选：座位：1 号位 · 定位：辅助')).toBeInTheDocument()
  })
})
