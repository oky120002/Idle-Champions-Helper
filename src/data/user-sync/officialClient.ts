import type { UserCredentials } from '../../domain/types'

export const OFFICIAL_PLAY_SERVER_BASE_URL = 'https://ps21.idlechampions.com/~idledragons/'
export const OFFICIAL_MOBILE_CLIENT_VERSION = '999'

export type ReadonlyOfficialEndpoint =
  | 'getuserdetails'
  | 'getcampaigndetails'
  | 'getallformationsaves'

const ALLOWED_ENDPOINTS = new Set<string>([
  'getuserdetails',
  'getcampaigndetails',
  'getallformationsaves',
])

const DEFAULT_ENDPOINT_PARAMS: Partial<Record<ReadonlyOfficialEndpoint, Record<string, string>>> = {
  getuserdetails: {
    instance_key: '1',
  },
  getcampaigndetails: {
    game_instance_id: '1',
    instance_id: '1',
  },
}

export interface BuildOfficialUrlOptions {
  endpoint: string
  credentials: UserCredentials
  baseUrl?: string
  params?: Record<string, string | number | boolean | null | undefined>
}

export interface UserProfilePayloads {
  userDetails: unknown
  campaignDetails: unknown
  formationSaves: unknown
}

export interface FetchUserProfilePayloadsOptions {
  fetchImpl?: typeof fetch
  baseUrl?: string
}

export function isAllowedEndpoint(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.has(endpoint)
}

export function buildOfficialUrl({
  endpoint,
  credentials,
  baseUrl = OFFICIAL_PLAY_SERVER_BASE_URL,
  params = {},
}: BuildOfficialUrlOptions): string {
  if (!isAllowedEndpoint(endpoint)) {
    throw new Error(
      `Endpoint "${endpoint}" is not allowed. Only read-only endpoints are permitted.`,
    )
  }

  const url = new URL('post.php', baseUrl)
  url.searchParams.set('call', endpoint)
  url.searchParams.set('user_id', credentials.userId)
  url.searchParams.set('hash', credentials.hash)
  url.searchParams.set('mobile_client_version', OFFICIAL_MOBILE_CLIENT_VERSION)

  const endpointDefaults = isAllowedEndpoint(endpoint)
    ? DEFAULT_ENDPOINT_PARAMS[endpoint as ReadonlyOfficialEndpoint] ?? {}
    : {}

  for (const [key, value] of Object.entries({ ...endpointDefaults, ...params })) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

export function createReadonlyFetchOptions(): RequestInit {
  return {
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  }
}

async function fetchReadonlyJson(
  endpoint: ReadonlyOfficialEndpoint,
  credentials: UserCredentials,
  options: FetchUserProfilePayloadsOptions,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch
  const urlOptions: BuildOfficialUrlOptions = {
    endpoint,
    credentials,
  }

  if (options.baseUrl) {
    urlOptions.baseUrl = options.baseUrl
  }

  if (params) {
    urlOptions.params = params
  }

  const url = buildOfficialUrl(urlOptions)
  const response = await fetchImpl(url, createReadonlyFetchOptions())

  if (!response.ok) {
    throw new Error(`Official endpoint returned HTTP ${response.status}`)
  }

  return response.json()
}

function readInstanceId(userDetails: unknown): string | null {
  if (!userDetails || typeof userDetails !== 'object') {
    return null
  }

  const root = userDetails as Record<string, unknown>
  const details = root.details && typeof root.details === 'object'
    ? root.details as Record<string, unknown>
    : null
  const value = details?.instance_id ?? root.instance_id
  return value === null || value === undefined || value === '' ? null : String(value)
}

export async function fetchUserProfilePayloads(
  credentials: UserCredentials,
  options: FetchUserProfilePayloadsOptions = {},
): Promise<UserProfilePayloads> {
  try {
    const userDetails = await fetchReadonlyJson('getuserdetails', credentials, options)
    const instanceId = readInstanceId(userDetails)
    const campaignDetails = await fetchReadonlyJson('getcampaigndetails', credentials, options)
    const formationSaves = await fetchReadonlyJson(
      'getallformationsaves',
      credentials,
      options,
      { instance_id: instanceId },
    )

    return {
      userDetails,
      campaignDetails,
      formationSaves,
    }
  } catch {
    throw new Error('官方数据同步失败：请检查凭证、网络或官方接口可用性。')
  }
}
