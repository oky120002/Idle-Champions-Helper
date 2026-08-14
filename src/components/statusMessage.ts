import type { MessageRef } from '../app/i18n'
import type { StatusTone } from './StatusBanner'

export interface StatusMessage {
  tone: StatusTone
  title: MessageRef
  detail: MessageRef
}

interface CreateStatusMessageOptions {
  tone: StatusTone
  title: MessageRef
  detail: MessageRef
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

export function createInfoStatusMessage(title: MessageRef, detail: MessageRef): StatusMessage {
  return createStatusMessage({ tone: 'info', title, detail })
}

export function createSuccessStatusMessage(title: MessageRef, detail: MessageRef): StatusMessage {
  return createStatusMessage({ tone: 'success', title, detail })
}

export function createErrorStatusMessage(title: MessageRef, detail: MessageRef): StatusMessage {
  return createStatusMessage({ tone: 'error', title, detail })
}
