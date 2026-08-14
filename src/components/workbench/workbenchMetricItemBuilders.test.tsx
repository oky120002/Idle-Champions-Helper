import { describe, expect, it } from 'vitest'
import type { MessageRef, TranslateParams } from '../../app/i18n'
import { t as translateText, translateRef } from '../../app/i18n-messages'
import { createWorkbenchShowingMetricItem } from './workbenchMetricItemBuilders'

function translateForTest(locale: 'zh-CN' | 'en-US') {
  return (text: string | MessageRef, params?: TranslateParams): string => {
    if (typeof text === 'string') return translateText(locale, text, params)
    return translateRef(locale, text)
  }
}

describe('workbenchMetricItemBuilders', () => {
  it('中文当前展示 metric 不显示英文单位', () => {
    expect(
      createWorkbenchShowingMetricItem({
        t: translateForTest('zh-CN'),
        locale: 'zh-CN',
        visibleCount: 18,
        filteredCount: 42,
        enUnitLabel: 'champions',
      }),
    ).toEqual({
      label: '当前展示',
      value: '18 / 42',
    })
  })

  it('英文当前展示 metric 保留单位', () => {
    expect(
      createWorkbenchShowingMetricItem({
        t: translateForTest('en-US'),
        locale: 'en-US',
        visibleCount: 18,
        filteredCount: 42,
        enUnitLabel: 'champions',
      }),
    ).toEqual({
      label: 'Showing',
      value: '18 / 42 champions',
    })
  })
})
