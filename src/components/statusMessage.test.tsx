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
    expect(createInfoStatusMessage({ key: '信息' }, { key: '说明' })).toEqual({
      tone: 'info',
      title: { key: '信息' },
      detail: { key: '说明' },
    })
    expect(createSuccessStatusMessage({ key: '成功' }, { key: '已完成' })).toEqual({
      tone: 'success',
      title: { key: '成功' },
      detail: { key: '已完成' },
    })
    expect(createErrorStatusMessage({ key: '失败' }, { key: '原因' })).toEqual({
      tone: 'error',
      title: { key: '失败' },
      detail: { key: '原因' },
    })
  })

  it('StatusMessageBanner 经 t() 按当前 locale 渲染双语（默认 zh-CN）', () => {
    render(
      <I18nProvider>
        <StatusMessageBanner
          message={createSuccessStatusMessage(
            { key: '保存成功' },
            { key: '已写入本地浏览器' },
          )}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('保存成功')).toBeInTheDocument()
    expect(screen.getByText('已写入本地浏览器')).toBeInTheDocument()
  })

  it('StatusMessageBanner 按英文真实渲染嵌套 MessageRef 参数', () => {
    window.localStorage.setItem('idle-champions-helper.locale', 'en-US')
    render(
      <I18nProvider>
        <StatusMessageBanner
          message={createErrorStatusMessage(
            { key: '保存版本 {p0} 已不可读，当前按 {p1} 兼容恢复。{p2}', params: {
              p0: 'v0',
              p1: 'v1',
              p2: { key: '{p0} 个槽位引用已失效', params: { p0: 1 } },
            } },
            { key: '当前只识别 schemaVersion={p0} 的{p1}；检测到旧版本为 {p2}。', params: {
              p0: 1,
              p1: { key: '草稿' },
              p2: 0,
            } },
          )}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('Saved version v0 is unavailable; restored compatibly with v1. 1 slot references are invalid')).toBeInTheDocument()
    expect(screen.getByText('Only 草稿 with schemaVersion=1 can be restored; found old version 0.')).toBeInTheDocument()
  })
})
