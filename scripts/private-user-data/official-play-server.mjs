const OFFICIAL_PLAY_SERVER_HOSTNAME_PATTERN = /^ps\d+\.idlechampions\.com$/i
const OFFICIAL_PLAY_SERVER_PATHNAME = '/~idledragons/'

const OFFICIAL_PLAY_SERVER_NUMBERS = [28, 29, 30, 27]

export const DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION = '999'
export const PRIVATE_MASTER_API_BASE_URL = 'https://master.idlechampions.com/~idledragons/'
export const PRIVATE_PLAY_SERVER_SWITCH_LIMIT = 2
export const DEFAULT_PRIVATE_BASE_URL = buildOfficialPlayServerBaseUrl(OFFICIAL_PLAY_SERVER_NUMBERS[0])
export const PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS = OFFICIAL_PLAY_SERVER_NUMBERS.map(
  (serverNumber) => buildOfficialPlayServerBaseUrl(serverNumber),
)

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

export function buildOfficialPlayServerBaseUrl(serverNumber) {
  return `https://ps${serverNumber}.idlechampions.com${OFFICIAL_PLAY_SERVER_PATHNAME}`
}

export function createReadonlyFetchOptions() {
  return {
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  }
}

export function normalizeOfficialPlayServerBaseUrl(value) {
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

export function readSwitchPlayServer(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const value = payload.switch_play_server
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function buildPlayServerDiscoveryUrl() {
  const query = new URLSearchParams({
    call: 'getPlayServerForDefinitions',
    mobile_client_version: DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION,
    network_id: '11',
  })

  return `${PRIVATE_MASTER_API_BASE_URL}post.php?${query.toString()}`
}

export async function discoverOfficialPlayServer(fetchImpl = fetch) {
  const response = await fetchImpl(
    buildPlayServerDiscoveryUrl(),
    createReadonlyFetchOptions(),
  )

  if (!response.ok) {
    throw new Error(`Official play server discovery returned HTTP ${response.status}`)
  }

  const payload = await response.json()
  const playServer = payload && typeof payload === 'object' ? payload.play_server : null

  if (typeof playServer !== 'string' || playServer.trim() === '') {
    throw new Error('Official play server discovery returned no play_server value.')
  }

  return normalizeOfficialPlayServerBaseUrl(playServer)
}

function pushUniqueBaseUrl(baseUrls, candidateBaseUrl) {
  const normalizedBaseUrl = normalizeOfficialPlayServerBaseUrl(candidateBaseUrl)

  if (!baseUrls.includes(normalizedBaseUrl)) {
    baseUrls.push(normalizedBaseUrl)
  }
}

export async function resolveOfficialPlayServerBaseUrls({ fetchImpl = fetch, baseUrl } = {}) {
  if (baseUrl) {
    return [normalizeOfficialPlayServerBaseUrl(baseUrl)]
  }

  const baseUrls = []

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
