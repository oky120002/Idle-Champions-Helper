import type { AppLocale, LocaleText } from '../../app/i18n'
import type { UserImportMethod, UserCredentials } from '../../domain/types'

export type UserDataPageTranslator = (text: LocaleText) => string

export type ParseState =
  | { status: 'idle' }
  | {
      status: 'success'
      credentials: UserCredentials
      method: UserImportMethod
      network: string | null
    }
  | { status: 'error'; message: string }

export type ImportMethodOption = {
  id: UserImportMethod
  label: string
  description: string
}

export type UserDataPageModel = {
  locale: AppLocale
  t: UserDataPageTranslator
  method: UserImportMethod
  supportUrl: string
  manualUserId: string
  manualHash: string
  webRequestLog: string
  parseState: ParseState
  importMethods: ImportMethodOption[]
  importMethodLabels: Record<UserImportMethod, string>
  selectedMethod: ImportMethodOption
  maskedCredentials: {
    userId: string
    hash: string
  } | null
  updateSupportUrl: (value: string) => void
  updateManualUserId: (value: string) => void
  updateManualHash: (value: string) => void
  updateWebRequestLog: (value: string) => void
  handleParse: () => void
  handleFillSample: () => void
  handleClear: () => void
  handleSelectMethod: (nextMethod: UserImportMethod) => void
}
