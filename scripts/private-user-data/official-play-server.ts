// 主机名曾为 psNN（纯数字），现演进为 ps<字母数字>（如 pslt4）。仍限定 idlechampions.com 域 + ps 前缀。
const OFFICIAL_PLAY_SERVER_HOSTNAME_PATTERN = /^ps[a-z0-9]+\.idlechampions\.com$/i
const OFFICIAL_PLAY_SERVER_PATHNAME = '/~idledragons/'

const OFFICIAL_PLAY_SERVER_NUMBERS: readonly number[] = [28, 29, 30, 27]

export const DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION: string = '999'
export const PRIVATE_MASTER_API_BASE_URL: string = 'https://master.idlechampions.com/~idledragons/'
export const PRIVATE_PLAY_SERVER_SWITCH_LIMIT: number = 2
export const DEFAULT_PRIVATE_BASE_URL: string = buildOfficialPlayServerBaseUrl(
  OFFICIAL_PLAY_SERVER_NUMBERS[0]!,
)
export const PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS: string[] = OFFICIAL_PLAY_SERVER_NUMBERS.map(
  (serverNumber) => buildOfficialPlayServerBaseUrl(serverNumber),
)

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

export function buildOfficialPlayServerBaseUrl(serverNumber: number): string {
  return `https://ps${serverNumber}.idlechampions.com${OFFICIAL_PLAY_SERVER_PATHNAME}`
}

export function createReadonlyFetchOptions(): RequestInit {
  return {
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  }
}

export function normalizeOfficialPlayServerBaseUrl(value: string): string {
  const normalized = ensureTrailingSlash(new URL(value).toString())
  const url = new URL(normalized)

  if (
    !OFFICIAL_PLAY_SERVER_HOSTNAME_PATTERN.test(url.hostname)
    || url.pathname !== OFFICIAL_PLAY_SERVER_PATHNAME
  ) {
    throw new Error('Rejected non-official play server URL.')
  }

  return normalized
}

export function readSwitchPlayServer(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const value = (payload as Record<string, unknown>).switch_play_server
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function buildPlayServerDiscoveryUrl(): string {
  const query = new URLSearchParams({
    call: 'getPlayServerForDefinitions',
    mobile_client_version: DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION,
    network_id: '11',
  })

  return `${PRIVATE_MASTER_API_BASE_URL}post.php?${query.toString()}`
}

export async function discoverOfficialPlayServer(
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(
    buildPlayServerDiscoveryUrl(),
    createReadonlyFetchOptions(),
  )

  if (!response.ok) {
    throw new Error(`Official play server discovery returned HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()
  const playServer = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>).play_server
    : null

  if (typeof playServer !== 'string' || playServer.trim() === '') {
    throw new Error('Official play server discovery returned no play_server value.')
  }

  return normalizeOfficialPlayServerBaseUrl(playServer)
}

function pushUniqueBaseUrl(baseUrls: string[], candidateBaseUrl: string): void {
  const normalizedBaseUrl = normalizeOfficialPlayServerBaseUrl(candidateBaseUrl)

  if (!baseUrls.includes(normalizedBaseUrl)) {
    baseUrls.push(normalizedBaseUrl)
  }
}

export interface ResolveOfficialPlayServerBaseUrlsOptions {
  fetchImpl?: typeof fetch
  baseUrl?: string
}

export async function resolveOfficialPlayServerBaseUrls(
  { fetchImpl = fetch, baseUrl }: ResolveOfficialPlayServerBaseUrlsOptions = {},
): Promise<string[]> {
  if (baseUrl) {
    return [normalizeOfficialPlayServerBaseUrl(baseUrl)]
  }

  const baseUrls: string[] = []

  try {
    pushUniqueBaseUrl(baseUrls, await discoverOfficialPlayServer(fetchImpl))
  } catch {
    // Discovery may lag or fail; keep a verified fallback list of official play server mirrors.
  }

  for (const fallbackBaseUrl of PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS) {
    pushUniqueBaseUrl(baseUrls, fallbackBaseUrl)
  }

  return baseUrls
}
