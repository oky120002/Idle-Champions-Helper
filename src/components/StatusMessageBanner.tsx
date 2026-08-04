import { useI18n } from '../app/i18n'
import { StatusBanner } from './StatusBanner'
import type { StatusMessage } from './statusMessage'

interface StatusMessageBannerProps {
  readonly message: StatusMessage | null
}

export function StatusMessageBanner({ message }: StatusMessageBannerProps) {
  const { t } = useI18n()
  if (!message) {
    return null
  }

  return <StatusBanner tone={message.tone} title={t(message.title)} detail={t(message.detail)} />
}
