import type { UserImportMessages } from '../../data/userImport'
import {
  getSupportUrlNetwork,
  parseManualCredentials,
  parseSupportUrl,
  parseWebRequestLog,
  SUPPORT_URL_SAMPLE,
  WEB_REQUEST_LOG_SAMPLE,
} from '../../data/userImport'
import type { UserImportMethod, UserImportParseResult } from '../../domain/types'
import type { ImportMethodOption, ParseState, UserDataPageTranslator } from './types'

type ParseUserImportOptions = {
  method: UserImportMethod
  supportUrl: string
  manualUserId: string
  manualHash: string
  webRequestLog: string
  messages: UserImportMessages
}

export function buildUserImportMessages(t: UserDataPageTranslator): UserImportMessages {
  return {
    invalidUserId: t("User ID 格式不对，当前仅接受纯数字。"),
    invalidHash: t("Hash 格式不对，当前仅接受十六进制字符串。"),
    missingSupportUrl: t("请先粘贴 Support URL。"),
    invalidSupportUrl: t("Support URL 不是合法链接。"),
    missingManualCredentials: t("请同时填写 User ID 和 Hash。"),
    missingLogText: t("请先粘贴日志文本。"),
    logMissingCredentials: t("没在日志里找到 user_id 和 hash/device_hash。"),
    logIncompleteCredentials: t("日志里提取到的凭证不完整。"),
  }
}

export function buildImportMethodOptions(t: UserDataPageTranslator): ImportMethodOption[] {
  return [
    {
      id: 'supportUrl',
      label: 'Support URL',
      description: t("最贴近真实使用方式，适合移动端和大多数平台。"),
    },
    {
      id: 'manual',
      label: t("手动填写"),
      description: t("适合已经知道 User ID 和 Hash，但不想贴完整链接的时候。"),
    },
    {
      id: 'webRequestLog',
      label: t("日志文本"),
      description: t("后续接 Steam / Epic 本地日志导入时，可以沿用同一套解析逻辑。"),
    },
  ]
}

export function buildImportMethodLabels(importMethods: ImportMethodOption[]): Record<UserImportMethod, string> {
  return Object.fromEntries(importMethods.map((item) => [item.id, item.label])) as Record<UserImportMethod, string>
}

export function getSelectedMethod(method: UserImportMethod, importMethods: ImportMethodOption[]): ImportMethodOption {
  const fallbackMethod = importMethods[0]

  if (!fallbackMethod) {
    throw new Error('User import modes must define at least one input method.')
  }

  return importMethods.find((item) => item.id === method) ?? fallbackMethod
}

export function parseUserImport({
  method,
  supportUrl,
  manualUserId,
  manualHash,
  webRequestLog,
  messages,
}: ParseUserImportOptions): ParseState {
  let result: UserImportParseResult
  if (method === 'supportUrl') {
    result = parseSupportUrl(supportUrl, messages)
  } else if (method === 'manual') {
    result = parseManualCredentials(manualUserId, manualHash, messages)
  } else {
    result = parseWebRequestLog(webRequestLog, messages)
  }

  if (!result.ok) {
    return {
      status: 'error',
      message: result.error,
    }
  }

  return {
    status: 'success',
    credentials: result.value,
    network: method === 'supportUrl' ? getSupportUrlNetwork(supportUrl) : null,
    method,
  }
}

export function buildSampleInput(method: UserImportMethod): {
  supportUrl?: string
  manualUserId?: string
  manualHash?: string
  webRequestLog?: string
} {
  if (method === 'supportUrl') {
    return {
      supportUrl: SUPPORT_URL_SAMPLE,
    }
  }

  if (method === 'manual') {
    return {
      manualUserId: '123456789',
      manualHash: 'abcdef1234567890abcdef1234567890',
    }
  }

  return {
    webRequestLog: WEB_REQUEST_LOG_SAMPLE,
  }
}
