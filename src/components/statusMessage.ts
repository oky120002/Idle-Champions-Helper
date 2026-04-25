import type { StatusTone } from './StatusBanner'

export interface StatusMessage {
  tone: StatusTone
  title: string
  detail: string
}

interface CreateStatusMessageOptions {
  tone: StatusTone
  title: string
  detail: string
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

export function createInfoStatusMessage(title: string, detail: string): StatusMessage {
  return createStatusMessage({ tone: 'info', title, detail })
}

export function createSuccessStatusMessage(title: string, detail: string): StatusMessage {
  return createStatusMessage({ tone: 'success', title, detail })
}

export function createErrorStatusMessage(title: string, detail: string): StatusMessage {
  return createStatusMessage({ tone: 'error', title, detail })
}
