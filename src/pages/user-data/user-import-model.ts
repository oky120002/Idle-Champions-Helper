import type { UserImportMessages } from '../../data/userImport'
import {
  getSupportUrlNetwork,
  parseManualCredentials,
  parseSupportUrl,
  parseWebRequestLog,
  SUPPORT_URL_SAMPLE,
  WEB_REQUEST_LOG_SAMPLE,
} from '../../data/userImport'
import type { UserImportMethod } from '../../domain/types'
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
    invalidUserId: t({ zh: 'User ID 格式不对，当前仅接受纯数字。', en: 'User ID must contain digits only.' }),
    invalidHash: t({
      zh: 'Hash 格式不对，当前仅接受十六进制字符串。',
      en: 'Hash must be a hexadecimal string.',
    }),
    missingSupportUrl: t({ zh: '请先粘贴 Support URL。', en: 'Paste a Support URL first.' }),
    invalidSupportUrl: t({ zh: 'Support URL 不是合法链接。', en: 'The Support URL is not a valid link.' }),
    missingManualCredentials: t({
      zh: '请同时填写 User ID 和 Hash。',
      en: 'Fill in both User ID and Hash.',
    }),
    missingLogText: t({ zh: '请先粘贴日志文本。', en: 'Paste the log text first.' }),
    logMissingCredentials: t({
      zh: '没在日志里找到 user_id 和 hash/device_hash。',
      en: 'No user_id and hash/device_hash pair was found in the log.',
    }),
    logIncompleteCredentials: t({
      zh: '日志里提取到的凭证不完整。',
      en: 'The credentials extracted from the log are incomplete.',
    }),
  }
}

export function buildImportMethodOptions(t: UserDataPageTranslator): ImportMethodOption[] {
  return [
    {
      id: 'supportUrl',
      label: 'Support URL',
      description: t({
        zh: '最贴近真实使用方式，适合移动端和大多数平台。',
        en: 'Closest to the real user flow and a good fit for mobile plus most platforms.',
      }),
    },
    {
      id: 'manual',
      label: t({ zh: '手动填写', en: 'Manual entry' }),
      description: t({
        zh: '适合已经知道 User ID 和 Hash，但不想贴完整链接的时候。',
        en: 'Best when you already know the User ID and Hash and do not want to paste the full link.',
      }),
    },
    {
      id: 'webRequestLog',
      label: t({ zh: '日志文本', en: 'Log text' }),
      description: t({
        zh: '后续接 Steam / Epic 本地日志导入时，可以沿用同一套解析逻辑。',
        en: 'This keeps the parsing model aligned with the future Steam / Epic local log import flow.',
      }),
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
  const result =
    method === 'supportUrl'
      ? parseSupportUrl(supportUrl, messages)
      : method === 'manual'
        ? parseManualCredentials(manualUserId, manualHash, messages)
        : parseWebRequestLog(webRequestLog, messages)

  if (!result.ok) {
    return {
      status: 'error',
      message: result.error,
    }
  }

  return {
    status: 'success',
    credentials: result.value,
    method,
    network: method === 'supportUrl' ? getSupportUrlNetwork(supportUrl) : null,
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
