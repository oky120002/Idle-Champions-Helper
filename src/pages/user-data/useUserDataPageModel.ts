import { useMemo, useState } from 'react'
import { useI18n } from '../../app/i18n'
import { buildMaskedCredentials } from '../../data/userImport'
import type { UserImportMethod } from '../../domain/types'
import {
  buildImportMethodLabels,
  buildImportMethodOptions,
  buildSampleInput,
  buildUserImportMessages,
  getSelectedMethod,
  parseUserImport,
} from './user-import-model'
import type { ParseState, UserDataPageModel } from './types'

export function useUserDataPageModel(): UserDataPageModel {
  const { locale, t } = useI18n()
  const [method, setMethod] = useState<UserImportMethod>('supportUrl')
  const [supportUrl, setSupportUrl] = useState('')
  const [manualUserId, setManualUserId] = useState('')
  const [manualHash, setManualHash] = useState('')
  const [webRequestLog, setWebRequestLog] = useState('')
  const [parseState, setParseState] = useState<ParseState>({ status: 'idle' })

  const messages = useMemo(() => buildUserImportMessages(t), [t])
  const importMethods = useMemo(() => buildImportMethodOptions(t), [t])
  const importMethodLabels = useMemo(() => buildImportMethodLabels(importMethods), [importMethods])
  const selectedMethod = useMemo(() => getSelectedMethod(method, importMethods), [importMethods, method])
  const maskedCredentials = parseState.status === 'success' ? buildMaskedCredentials(parseState.credentials) : null

  function handleParse() {
    setParseState(
      parseUserImport({
        method,
        supportUrl,
        manualUserId,
        manualHash,
        webRequestLog,
        messages,
      }),
    )
  }

  function handleFillSample() {
    const sampleInput = buildSampleInput(method)

    if (sampleInput.supportUrl) {
      setSupportUrl(sampleInput.supportUrl)
      return
    }

    if (sampleInput.manualUserId && sampleInput.manualHash) {
      setManualUserId(sampleInput.manualUserId)
      setManualHash(sampleInput.manualHash)
      return
    }

    setWebRequestLog(sampleInput.webRequestLog ?? '')
  }

  function handleClear() {
    if (method === 'supportUrl') {
      setSupportUrl('')
    } else if (method === 'manual') {
      setManualUserId('')
      setManualHash('')
    } else {
      setWebRequestLog('')
    }

    setParseState({ status: 'idle' })
  }

  function handleSelectMethod(nextMethod: UserImportMethod) {
    setMethod(nextMethod)
    setParseState({ status: 'idle' })
  }

  return {
    locale,
    t,
    method,
    supportUrl,
    manualUserId,
    manualHash,
    webRequestLog,
    parseState,
    importMethods,
    importMethodLabels,
    selectedMethod,
    maskedCredentials,
    updateSupportUrl: setSupportUrl,
    updateManualUserId: setManualUserId,
    updateManualHash: setManualHash,
    updateWebRequestLog: setWebRequestLog,
    handleParse,
    handleFillSample,
    handleClear,
    handleSelectMethod,
  }
}
