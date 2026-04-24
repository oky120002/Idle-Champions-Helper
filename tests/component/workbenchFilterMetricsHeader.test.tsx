import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkbenchFilterMetricsHeader } from '../../src/components/workbench/WorkbenchFilterMetricsHeader'

function getMetricByText(text: string) {
  return Array.from(document.querySelectorAll('.page-header-metric')).find((element) => element.textContent === text)
}

describe('WorkbenchFilterMetricsHeader', () => {
  it('按配置渲染紧凑 metrics 和当前筛选摘要', () => {
    render(
      <WorkbenchFilterMetricsHeader
        items={[
          {
            label: '当前展示',
            value: '48 / 60',
          },
        ]}
        activeFilters={['座位：1 号位', '定位：辅助']}
        filterSummaryPrefix="当前筛选："
      />,
    )

    expect(getMetricByText('当前展示48 / 60')).toBeTruthy()
    expect(screen.getByText('当前筛选：座位：1 号位 · 定位：辅助')).toBeInTheDocument()
  })

  it('未提供筛选摘要前缀时不渲染摘要占位', () => {
    render(
      <WorkbenchFilterMetricsHeader
        items={[
          {
            label: '当前展示',
            value: '48 / 60',
          },
        ]}
      />,
    )

    expect(document.querySelector('.workbench-filter-header__filter-summary')).toBeNull()
  })
})
