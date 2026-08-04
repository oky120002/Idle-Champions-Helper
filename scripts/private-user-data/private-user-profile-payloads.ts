import process from 'node:process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { loadPrivateCredentials, parseLocalEnvFile } from './private-env-loader.ts'
import {
  createReadonlyFetchOptions,
  DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION,
  normalizeOfficialPlayServerBaseUrl,
  PRIVATE_PLAY_SERVER_SWITCH_LIMIT,
  readSwitchPlayServer,
  resolveOfficialPlayServerBaseUrls,
} from './official-play-server.ts'
import {
  createManifest,
  writeManifest,
  type PrivateSnapshotManifest,
} from './private-snapshot-manifest.ts'

export {
  createReadonlyFetchOptions,
  DEFAULT_PRIVATE_BASE_URL,
  DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION,
  PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS,
} from './official-play-server.ts'

export const DEFAULT_PRIVATE_ENV_FILE: string = '.env.private-user.local'
export const DEFAULT_PRIVATE_LATEST_DIR: string = 'tmp/private-user-data/latest'
export const DEFAULT_PRIVATE_PAYLOAD_FILENAME: string = 'user-profile-payloads.json'

const ALLOWED_ENDPOINTS: ReadonlySet<string> = new Set([
  'getuserdetails',
  'getcampaigndetails',
  'getallformationsaves',
])

export interface PrivateCredentials {
  userId: string
  hash: string
}

export type OfficialUrlParams = Record<string, string | number | boolean | null | undefined>

export interface BuildOfficialUrlOptions {
  endpoint: string
  credentials: PrivateCredentials
  baseUrl: string
  params?: OfficialUrlParams
}

export interface FetchPrivateUserProfilePayloadsOptions {
  credentials: PrivateCredentials
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export interface FetchAndStorePrivateUserProfilePayloadsOptions {
  envFile?: string
  baseUrl?: string
  latestDir?: string
  payloadFilename?: string
  env?: Record<string, string | undefined>
  fetchImpl?: typeof fetch
  cwd?: string
}

export interface UserProfilePayloads {
  userDetails: unknown
  campaignDetails: unknown
  formationSaves: unknown
}

export interface FetchAndStoreResult {
  manifest: PrivateSnapshotManifest
  payloads: UserProfilePayloads
  timestampDir: string
  latestDir: string
}

interface FetchReadonlyJsonFollowingSwitchResult {
  payload: unknown
  baseUrl: string
}

async function readOptionalEnvFile(envFilePath: string): Promise<string | null> {
  try {
    return await fs.readFile(envFilePath, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export function buildOfficialUrl({
  endpoint,
  credentials,
  baseUrl,
  params = {},
}: BuildOfficialUrlOptions): string {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    throw new Error(`Endpoint "${endpoint}" is not allowed for private dev fetches.`)
  }

  const url = new URL('post.php', normalizeOfficialPlayServerBaseUrl(baseUrl))
  url.searchParams.set('call', endpoint)
  url.searchParams.set('user_id', credentials.userId)
  url.searchParams.set('hash', credentials.hash)
  url.searchParams.set('mobile_client_version', DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION)

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue
    }
    if (value === '') {
      continue
    }
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

async function fetchReadonlyJson({
  endpoint,
  credentials,
  baseUrl,
  params,
  fetchImpl,
}: {
  endpoint: string
  credentials: PrivateCredentials
  baseUrl: string
  params: OfficialUrlParams
  fetchImpl: typeof fetch
}): Promise<unknown> {
  const response = await fetchImpl(
    buildOfficialUrl({ endpoint, credentials, baseUrl, params }),
    createReadonlyFetchOptions(),
  )

  if (!response.ok) {
    throw new Error(`Official endpoint "${endpoint}" returned HTTP ${response.status}.`)
  }

  return response.json()
}

function hasPayloadValue(payload: unknown, key: string): boolean {
  return Boolean(payload && typeof payload === 'object' && key in payload)
}

function isPayloadReady(endpoint: string, payload: unknown): boolean {
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

async function fetchReadonlyJsonFollowingPlayServerSwitch({
  endpoint,
  credentials,
  baseUrl,
  params,
  fetchImpl,
}: {
  endpoint: string
  credentials: PrivateCredentials
  baseUrl: string
  params: OfficialUrlParams
  fetchImpl: typeof fetch
}): Promise<FetchReadonlyJsonFollowingSwitchResult> {
  let currentBaseUrl = baseUrl
  let switchCount = 0

  while (true) {
    const payload = await fetchReadonlyJson({
      endpoint,
      credentials,
      baseUrl: currentBaseUrl,
      params,
      fetchImpl,
    })
    const switchPlayServer = readSwitchPlayServer(payload)

    if (switchPlayServer && !isPayloadReady(endpoint, payload)) {
      if (switchCount >= PRIVATE_PLAY_SERVER_SWITCH_LIMIT) {
        throw new Error('Official endpoint requested too many play server switches.')
      }

      currentBaseUrl = normalizeOfficialPlayServerBaseUrl(switchPlayServer)
      switchCount += 1
      continue
    }

    if (!isPayloadReady(endpoint, payload)) {
      throw new Error(`Official endpoint "${endpoint}" returned an unexpected payload.`)
    }

    return {
      payload,
      baseUrl: currentBaseUrl,
    }
  }
}

function readInstanceId(userDetails: unknown): string | null {
  if (!userDetails || typeof userDetails !== 'object') {
    return null
  }

  const root = userDetails as Record<string, unknown>
  const detailsRaw = root.details
  const details = detailsRaw && typeof detailsRaw === 'object'
    ? (detailsRaw as Record<string, unknown>)
    : null
  const value: unknown = details?.instance_id ?? root.instance_id
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

async function fetchPrivateUserProfilePayloadsFromBaseUrl({
  credentials,
  baseUrl,
  fetchImpl = fetch,
}: {
  credentials: PrivateCredentials
  baseUrl: string
  fetchImpl?: typeof fetch
}): Promise<UserProfilePayloads> {
  const userDetailsResult = await fetchReadonlyJsonFollowingPlayServerSwitch({
    endpoint: 'getuserdetails',
    credentials,
    baseUrl,
    params: { instance_key: '1' },
    fetchImpl,
  })
  const campaignDetailsResult = await fetchReadonlyJsonFollowingPlayServerSwitch({
    endpoint: 'getcampaigndetails',
    credentials,
    baseUrl: userDetailsResult.baseUrl,
    params: { game_instance_id: '1', instance_id: '1' },
    fetchImpl,
  })
  const formationSavesResult = await fetchReadonlyJsonFollowingPlayServerSwitch({
    endpoint: 'getallformationsaves',
    credentials,
    baseUrl: campaignDetailsResult.baseUrl,
    params: { instance_id: readInstanceId(userDetailsResult.payload) },
    fetchImpl,
  })

  return {
    userDetails: userDetailsResult.payload,
    campaignDetails: campaignDetailsResult.payload,
    formationSaves: formationSavesResult.payload,
  }
}

export async function fetchPrivateUserProfilePayloads({
  credentials,
  baseUrl,
  fetchImpl = fetch,
}: FetchPrivateUserProfilePayloadsOptions): Promise<UserProfilePayloads> {
  const baseUrls = await resolveOfficialPlayServerBaseUrls({
    fetchImpl,
    ...(baseUrl !== undefined ? { baseUrl } : {}),
  })

  for (const candidateBaseUrl of baseUrls) {
    try {
      return await fetchPrivateUserProfilePayloadsFromBaseUrl({
        credentials,
        baseUrl: candidateBaseUrl,
        fetchImpl,
      })
    } catch {
      // Try the next official play server mirror.
    }
  }

  throw new Error('All official play server mirrors failed.')
}

async function writeJson(targetPath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function fetchAndStorePrivateUserProfilePayloads({
  envFile = DEFAULT_PRIVATE_ENV_FILE,
  baseUrl,
  latestDir = DEFAULT_PRIVATE_LATEST_DIR,
  payloadFilename = DEFAULT_PRIVATE_PAYLOAD_FILENAME,
  env = process.env,
  fetchImpl = fetch,
  cwd = process.cwd(),
}: FetchAndStorePrivateUserProfilePayloadsOptions = {}): Promise<FetchAndStoreResult> {
  const envFilePath = path.resolve(cwd, envFile)
  const envFileContent = await readOptionalEnvFile(envFilePath)
  const fileEnv = envFileContent ? parseLocalEnvFile(envFileContent) : {}
  const credentialsResult = loadPrivateCredentials({
    env: {
      ...fileEnv,
      ...env,
    },
  })

  const { error, userId, hash } = credentialsResult
  if (error || !userId || !hash) {
    throw new Error(error ?? 'Missing private credentials.')
  }

  const credentials: PrivateCredentials = { userId, hash }
  const payloads = await fetchPrivateUserProfilePayloads({
    credentials,
    ...(baseUrl !== undefined ? { baseUrl } : {}),
    fetchImpl,
  })

  const manifest = createManifest({
    payloadName: payloadFilename,
    userId: credentials.userId,
    hash: credentials.hash,
  })
  writeManifest({ targetDir: manifest.outputDir, manifest })
  writeManifest({ targetDir: latestDir, manifest })

  const timestampDir = path.resolve(cwd, manifest.outputDir)
  const resolvedLatestDir = path.resolve(cwd, latestDir)

  await writeJson(path.join(timestampDir, payloadFilename), payloads)
  await writeJson(path.join(timestampDir, 'manifest.json'), manifest)
  await fs.rm(resolvedLatestDir, { recursive: true, force: true })
  await writeJson(path.join(resolvedLatestDir, payloadFilename), payloads)
  await writeJson(path.join(resolvedLatestDir, 'manifest.json'), manifest)

  return {
    manifest,
    payloads,
    timestampDir,
    latestDir: resolvedLatestDir,
  }
}
