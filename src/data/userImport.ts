import type {
  MaskedUserCredentials,
  UserImportMethod,
  UserImportParseResult,
  UserCredentials,
} from '../domain/types'

const USER_ID_PATTERN = /^\d{1,12}$/
const HASH_PATTERN = /^[a-f0-9]{8,64}$/i

export interface UserImportMessages {
  invalidUserId: string
  invalidHash: string
  missingSupportUrl: string
  invalidSupportUrl: string
  missingManualCredentials: string
  missingLogText: string
  logMissingCredentials: string
  logIncompleteCredentials: string
}

const DEFAULT_MESSAGES: UserImportMessages = {
  invalidUserId: 'User ID 格式不对，当前仅接受纯数字。',
  invalidHash: 'Hash 格式不对，当前仅接受十六进制字符串。',
  missingSupportUrl: '请先粘贴 Support URL。',
  invalidSupportUrl: 'Support URL 不是合法链接。',
  missingManualCredentials: '请同时填写 User ID 和 Hash。',
  missingLogText: '请先粘贴日志文本。',
  logMissingCredentials: '没在日志里找到 user_id 和 hash/device_hash。',
  logIncompleteCredentials: '日志里提取到的凭证不完整。',
}

export const SUPPORT_URL_SAMPLE =
  'https://help.idlechampions.com/?page=help&network=mobile&user_id=123456789&device_hash=abcdef1234567890abcdef1234567890&mcv=385'

export const WEB_REQUEST_LOG_SAMPLE = `POST /~idledragons/post.php?call=getuserdetails&language_id=1&user_id=123456789&hash=abcdef1234567890abcdef1234567890&instance_key=1&timestamp=1710000000 HTTP/1.1
Host: ps28.idlechampions.com
`

function normalizeHash(value: string): string {
  return value.trim().toLowerCase()
}

function validateCredentials(
  userId: string,
  hash: string,
  messages: UserImportMessages,
): UserImportParseResult {
  const normalizedUserId = userId.trim()
  const normalizedHash = normalizeHash(hash)

  if (!USER_ID_PATTERN.test(normalizedUserId)) {
    return {
      ok: false,
      error: messages.invalidUserId,
    }
  }

  if (!HASH_PATTERN.test(normalizedHash)) {
    return {
      ok: false,
      error: messages.invalidHash,
    }
  }

  return {
    ok: true,
    value: {
      userId: normalizedUserId,
      hash: normalizedHash,
    },
  }
}

export function parseSupportUrl(
  value: string,
  messages: UserImportMessages = DEFAULT_MESSAGES,
): UserImportParseResult {
  const trimmed = value.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: messages.missingSupportUrl,
    }
  }

  let url: URL

  try {
    url = new URL(trimmed)
  } catch {
    return {
      ok: false,
      error: messages.invalidSupportUrl,
    }
  }

  const userId = url.searchParams.get('user_id') ?? ''
  const hash = url.searchParams.get('device_hash') ?? url.searchParams.get('hash') ?? ''

  return validateCredentials(userId, hash, messages)
}

export function getSupportUrlNetwork(value: string): string | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  try {
    return new URL(trimmed).searchParams.get('network')
  } catch {
    return null
  }
}

export function parseManualCredentials(
  userId: string,
  hash: string,
  messages: UserImportMessages = DEFAULT_MESSAGES,
): UserImportParseResult {
  if (!userId.trim() || !hash.trim()) {
    return {
      ok: false,
      error: messages.missingManualCredentials,
    }
  }

  return validateCredentials(userId, hash, messages)
}

export function parseWebRequestLog(
  value: string,
  messages: UserImportMessages = DEFAULT_MESSAGES,
): UserImportParseResult {
  const trimmed = value.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: messages.missingLogText,
    }
  }

  const directMatch =
    trimmed.match(/user_id=(\d+)[\s\S]*?(?:device_hash|hash)=([a-f0-9]+)/i) ??
    trimmed.match(/(?:device_hash|hash)=([a-f0-9]+)[\s\S]*?user_id=(\d+)/i)

  if (!directMatch) {
    return {
      ok: false,
      error: messages.logMissingCredentials,
    }
  }

  if (directMatch.length < 3) {
    return {
      ok: false,
      error: messages.logIncompleteCredentials,
    }
  }

  const [first, second] = directMatch.slice(1, 3)
  const userId = USER_ID_PATTERN.test(first) ? first : second
  const hash = USER_ID_PATTERN.test(first) ? second : first

  return validateCredentials(userId, hash, messages)
}

export function buildMaskedCredentials(credentials: UserCredentials): MaskedUserCredentials {
  const userId = credentials.userId
  const hash = credentials.hash

  return {
    userId:
      userId.length <= 4
        ? `${userId.slice(0, 1)}***`
        : `${userId.slice(0, 2)}***${userId.slice(-2)}`,
    hash:
      hash.length <= 10
        ? `${hash.slice(0, 2)}***${hash.slice(-2)}`
        : `${hash.slice(0, 6)}***${hash.slice(-4)}`,
  }
}

export function getImportMethodLabel(method: UserImportMethod): string {
  switch (method) {
    case 'supportUrl':
      return 'Support URL'
    case 'manual':
      return '手动填写'
    case 'webRequestLog':
      return '日志文本'
  }
}
