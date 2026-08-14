import { describe, expect, it } from 'vitest'
import type { MessageRef, TranslateParams } from '../../app/i18n'
import { t as translateText, translateRef } from '../../app/i18n-messages'
import { createWorkbenchShowingMetricItem } from './workbenchMetricItemBuilders'

function translateForTest(text: string | MessageRef, params?: TranslateParams): string {
  if (typeof text === 'string') return translateText('zh-CN', text, params)
  return translateRef('zh-CN', text)
}

describe('workbenchMetricItemBuilders', () => {
  it('构造统一的当前展示 metric', () => {
    expect(
      createWorkbenchShowingMetricItem({
          t: translateForTest,
        visibleCount: 18,
        filteredCount: 42,
        enUnitLabel: 'champions',
      }),
    ).toEqual({
      label: '当前展示',
      value: '18 / 42 champions',
    })
  })
})
