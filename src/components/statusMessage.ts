import type { LocaleText } from '../app/i18n'
import type { StatusTone } from './StatusBanner'

// title/detail 用 LocaleText（zh/en 双语），由 StatusMessageBanner 经 t() 按当前 locale 渲染；
// 创建侧（事件处理，无 hooks 上下文）传完整双语对，动态内容（版本号/错误信息）在调用方插值。
export interface StatusMessage {
  tone: StatusTone
  title: LocaleText
  detail: LocaleText
}

interface CreateStatusMessageOptions {
  tone: StatusTone
  title: LocaleText
  detail: LocaleText
}

export function createStatusMessage({
  tone,
  title,
  detail,
}: CreateStatusMessageOptions): StatusMessage {
  return {
    tone,
    title,
    detail,
  }
}

export function createInfoStatusMessage(title: LocaleText, detail: LocaleText): StatusMessage {
  return createStatusMessage({ tone: 'info', title, detail })
}

export function createSuccessStatusMessage(title: LocaleText, detail: LocaleText): StatusMessage {
  return createStatusMessage({ tone: 'success', title, detail })
}

export function createErrorStatusMessage(title: LocaleText, detail: LocaleText): StatusMessage {
  return createStatusMessage({ tone: 'error', title, detail })
}
