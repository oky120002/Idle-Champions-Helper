import type { UserCredentials } from '../../domain/types'
import {
  createReadonlyFetchOptions,
  OFFICIAL_MOBILE_CLIENT_VERSION,
  OFFICIAL_PLAY_SERVER_BASE_URL,
  OFFICIAL_PLAY_SERVER_SWITCH_LIMIT,
  normalizeOfficialPlayServerBaseUrl,
  readSwitchPlayServer,
  resolveOfficialPlayServerBaseUrls,
} from './officialPlayServer'

export {
  createReadonlyFetchOptions,
  OFFICIAL_PLAY_SERVER_FALLBACK_BASE_URLS,
} from './officialPlayServer'

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

  const url = new URL('post.php', normalizeOfficialPlayServerBaseUrl(baseUrl))
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

interface FetchReadonlyJsonResult {
  payload: unknown
  baseUrl: string
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

function hasPayloadValue(payload: unknown, key: string): boolean {
  return Boolean(payload && typeof payload === 'object' && key in payload)
}

function isPayloadReady(
  endpoint: ReadonlyOfficialEndpoint,
  payload: unknown,
): boolean {
  switch (endpoint) {
    case 'getuserdetails':
      return hasPayloadValue(payload, 'details')
    case 'getcampaigndetails':
      return hasPayloadValue(payload, 'campaigns')
    case 'getallformationsaves':
      return hasPayloadValue(payload, 'all_saves')
    default:
      return false
  }
}

async function fetchReadonlyJsonFollowingPlayServerSwitch(
  endpoint: ReadonlyOfficialEndpoint,
  credentials: UserCredentials,
  options: FetchUserProfilePayloadsOptions,
  initialBaseUrl: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<FetchReadonlyJsonResult> {
  let baseUrl = initialBaseUrl
  let switchCount = 0

  while (true) {
    const payload = await fetchReadonlyJson(
      endpoint,
      credentials,
      { ...options, baseUrl },
      params,
    )
    const switchPlayServer = readSwitchPlayServer(payload)

    if (switchPlayServer && !isPayloadReady(endpoint, payload)) {
      if (switchCount >= OFFICIAL_PLAY_SERVER_SWITCH_LIMIT) {
        throw new Error('Official endpoint requested too many play server switches.')
      }

      baseUrl = normalizeOfficialPlayServerBaseUrl(switchPlayServer)
      switchCount += 1
      continue
    }

    if (!isPayloadReady(endpoint, payload)) {
      throw new Error(`Official endpoint "${endpoint}" returned an unexpected payload.`)
    }

    return {
      payload,
      baseUrl,
    }
  }
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
  if (value === null || value === undefined || value === '') {
    return null
  }
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : null
}

async function fetchUserProfilePayloadsFromBaseUrl(
  credentials: UserCredentials,
  options: FetchUserProfilePayloadsOptions,
  baseUrl: string,
): Promise<UserProfilePayloads> {
  const userDetailsResult = await fetchReadonlyJsonFollowingPlayServerSwitch(
    'getuserdetails',
    credentials,
    options,
    baseUrl,
    { instance_key: '1' },
  )
  const instanceId = readInstanceId(userDetailsResult.payload)
  const campaignDetailsResult = await fetchReadonlyJsonFollowingPlayServerSwitch(
    'getcampaigndetails',
    credentials,
    options,
    userDetailsResult.baseUrl,
    { game_instance_id: '1', instance_id: '1' },
  )
  const formationSavesResult = await fetchReadonlyJsonFollowingPlayServerSwitch(
    'getallformationsaves',
    credentials,
    options,
    campaignDetailsResult.baseUrl,
    { instance_id: instanceId },
  )

  return {
    userDetails: userDetailsResult.payload,
    campaignDetails: campaignDetailsResult.payload,
    formationSaves: formationSavesResult.payload,
  }
}

export async function fetchUserProfilePayloads(
  credentials: UserCredentials,
  options: FetchUserProfilePayloadsOptions = {},
): Promise<UserProfilePayloads> {
  const baseUrls = await resolveOfficialPlayServerBaseUrls(options)

  try {
    for (const baseUrl of baseUrls) {
      try {
        return await fetchUserProfilePayloadsFromBaseUrl(credentials, options, baseUrl)
      } catch {
        // Try the next official play server mirror.
      }
    }

    throw new Error('All official play server mirrors failed.')
  } catch {
    throw new Error('官方数据同步失败：请检查凭证、网络或官方接口可用性。')
  }
}
