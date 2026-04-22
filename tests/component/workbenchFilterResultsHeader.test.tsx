import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeaderMetrics } from '../../src/components/PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from '../../src/components/workbench/WorkbenchScaffold'

function getMetricByText(text: string) {
  return Array.from(document.querySelectorAll('.page-header-metric')).find((element) => element.textContent === text)
}

describe('WorkbenchFilterResultsHeader', () => {
  it('只传 metrics 时不再渲染重复的标题文案区', () => {
    render(
      <WorkbenchFilterResultsHeader
        metrics={(
          <PageHeaderMetrics
            items={[
              {
                label: '当前展示',
                value: '48 / 60 名英雄',
              },
            ]}
            variant="compact"
          />
        )}
        summaryBadge={<span>默认先展示 48 名英雄</span>}
        actions={<button type="button">显示全部 60 名</button>}
      />,
    )

    expect(screen.queryByRole('heading')).toBeNull()
    expect(getMetricByText('当前展示48 / 60 名英雄')).toBeTruthy()
    expect(screen.getByText('默认先展示 48 名英雄')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '显示全部 60 名' })).toBeInTheDocument()
  })
})
