const OFFICIAL_PLAY_SERVER_HOSTNAME_PATTERN = /^ps\d+\.idlechampions\.com$/i
const OFFICIAL_PLAY_SERVER_PATHNAME = '/~idledragons/'

const OFFICIAL_PLAY_SERVER_NUMBERS = [28, 29, 30, 27] as const

export const OFFICIAL_MASTER_API_BASE_URL = 'https://master.idlechampions.com/~idledragons/'
export const OFFICIAL_MOBILE_CLIENT_VERSION = '999'
export const OFFICIAL_PLAY_SERVER_SWITCH_LIMIT = 2
export const OFFICIAL_PLAY_SERVER_BASE_URL = buildOfficialPlayServerBaseUrl(OFFICIAL_PLAY_SERVER_NUMBERS[0])
export const OFFICIAL_PLAY_SERVER_FALLBACK_BASE_URLS = OFFICIAL_PLAY_SERVER_NUMBERS.map(
  (serverNumber) => buildOfficialPlayServerBaseUrl(serverNumber),
)

export function ensureTrailingSlash(value: string): string {
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
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const value = (payload as Record<string, unknown>).switch_play_server
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function buildPlayServerDiscoveryUrl(): string {
  const query = new URLSearchParams({
    call: 'getPlayServerForDefinitions',
    mobile_client_version: OFFICIAL_MOBILE_CLIENT_VERSION,
    network_id: '11',
  })

  return `${OFFICIAL_MASTER_API_BASE_URL}post.php?${query.toString()}`
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
  const playServer = typeof payload === 'object' && payload !== null
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

export async function resolveOfficialPlayServerBaseUrls(options: {
  fetchImpl?: typeof fetch
  baseUrl?: string
} = {}): Promise<string[]> {
  const fetchImpl = options.fetchImpl ?? fetch

  if (options.baseUrl !== undefined && options.baseUrl !== '') {
    return [normalizeOfficialPlayServerBaseUrl(options.baseUrl)]
  }

  const baseUrls: string[] = []

  try {
    pushUniqueBaseUrl(baseUrls, await discoverOfficialPlayServer(fetchImpl))
  } catch {
    // Discovery may lag or fail; keep a verified fallback list of official play server mirrors.
  }

  for (const baseUrl of OFFICIAL_PLAY_SERVER_FALLBACK_BASE_URLS) {
    pushUniqueBaseUrl(baseUrls, baseUrl)
  }

  return baseUrls
}
