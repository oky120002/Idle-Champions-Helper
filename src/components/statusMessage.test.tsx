import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../app/i18n'
import { StatusMessageBanner } from './StatusMessageBanner'
import {
  createErrorStatusMessage,
  createInfoStatusMessage,
  createSuccessStatusMessage,
} from './statusMessage'

describe('statusMessage helpers', () => {
  it('构造不同 tone 的双语状态消息', () => {
    expect(createInfoStatusMessage({ zh: '信息', en: 'Info' }, { zh: '说明', en: 'Note' })).toEqual({
      tone: 'info',
      title: { zh: '信息', en: 'Info' },
      detail: { zh: '说明', en: 'Note' },
    })
    expect(createSuccessStatusMessage({ zh: '成功', en: 'Done' }, { zh: '已完成', en: 'Completed' })).toEqual({
      tone: 'success',
      title: { zh: '成功', en: 'Done' },
      detail: { zh: '已完成', en: 'Completed' },
    })
    expect(createErrorStatusMessage({ zh: '失败', en: 'Failed' }, { zh: '原因', en: 'Reason' })).toEqual({
      tone: 'error',
      title: { zh: '失败', en: 'Failed' },
      detail: { zh: '原因', en: 'Reason' },
    })
  })

  it('StatusMessageBanner 经 t() 按当前 locale 渲染双语（默认 zh-CN）', () => {
    render(
      <I18nProvider>
        <StatusMessageBanner
          message={createSuccessStatusMessage(
            { zh: '保存成功', en: 'Saved' },
            { zh: '已写入本地浏览器', en: 'Written to local browser' },
          )}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('保存成功')).toBeInTheDocument()
    expect(screen.getByText('已写入本地浏览器')).toBeInTheDocument()
  })
})
