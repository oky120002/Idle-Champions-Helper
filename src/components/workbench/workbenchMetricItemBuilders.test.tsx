import { describe, expect, it } from 'vitest'
import { createWorkbenchShowingMetricItem } from './workbenchMetricItemBuilders'

describe('workbenchMetricItemBuilders', () => {
  it('构造统一的当前展示 metric', () => {
    expect(
      createWorkbenchShowingMetricItem({
        t: ({ zh, en }) => (zh !== '' ? zh : en),
        visibleCount: 18,
        filteredCount: 42,
        enUnitLabel: 'champions',
      }),
    ).toEqual({
      label: '当前展示',
      value: '18 / 42',
    })
  })
})
