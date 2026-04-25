import { StatusBanner } from './StatusBanner'
import type { StatusMessage } from './statusMessage'

interface StatusMessageBannerProps {
  message: StatusMessage | null
}

export function StatusMessageBanner({ message }: StatusMessageBannerProps) {
  if (!message) {
    return null
  }

  return <StatusBanner tone={message.tone} title={message.title} detail={message.detail} />
}
