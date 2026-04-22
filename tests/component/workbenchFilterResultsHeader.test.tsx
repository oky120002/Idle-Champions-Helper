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
                value: '48 / 60',
              },
            ]}
            variant="compact"
          />
        )}
      />,
    )

    expect(screen.queryByRole('heading')).toBeNull()
    expect(getMetricByText('当前展示48 / 60')).toBeTruthy()
  })
})
