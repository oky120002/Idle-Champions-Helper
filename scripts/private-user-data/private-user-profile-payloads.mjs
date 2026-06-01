import fs from 'node:fs/promises'
import path from 'node:path'
import { loadPrivateCredentials, parseLocalEnvFile } from './private-env-loader.mjs'
import {
  createReadonlyFetchOptions,
  DEFAULT_PRIVATE_BASE_URL,
  DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION,
  normalizeOfficialPlayServerBaseUrl,
  PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS,
  PRIVATE_PLAY_SERVER_SWITCH_LIMIT,
  readSwitchPlayServer,
  resolveOfficialPlayServerBaseUrls,
} from './official-play-server.mjs'
import { createManifest, writeManifest } from './private-snapshot-manifest.mjs'

export {
  createReadonlyFetchOptions,
  DEFAULT_PRIVATE_BASE_URL,
  DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION,
  PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS,
} from './official-play-server.mjs'

export const DEFAULT_PRIVATE_ENV_FILE = '.env.private-user.local'
export const DEFAULT_PRIVATE_LATEST_DIR = 'tmp/private-user-data/latest'
export const DEFAULT_PRIVATE_PAYLOAD_FILENAME = 'user-profile-payloads.json'

const ALLOWED_ENDPOINTS = new Set([
  'getuserdetails',
  'getcampaigndetails',
  'getallformationsaves',
])

/**
 * @typedef {{
 *   credentials: { userId: string, hash: string }
 *   baseUrl?: string
 *   fetchImpl?: typeof fetch
 * }} FetchPrivateUserProfilePayloadsOptions
 */

/**
 * @typedef {{
 *   envFile?: string
 *   baseUrl?: string
 *   latestDir?: string
 *   payloadFilename?: string
 *   env?: Record<string, string | undefined>
 *   fetchImpl?: typeof fetch
 *   cwd?: string
 * }} FetchAndStorePrivateUserProfilePayloadsOptions
 */

async function readOptionalEnvFile(envFilePath) {
  try {
    return await fs.readFile(envFilePath, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}
export function buildOfficialUrl({ endpoint, credentials, baseUrl, params = {} }) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    throw new Error(`Endpoint "${endpoint}" is not allowed for private dev fetches.`)
  }

  const url = new URL('post.php', normalizeOfficialPlayServerBaseUrl(baseUrl))
  url.searchParams.set('call', endpoint)
  url.searchParams.set('user_id', credentials.userId)
  url.searchParams.set('hash', credentials.hash)
  url.searchParams.set('mobile_client_version', DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION)

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}
async function fetchReadonlyJson({ endpoint, credentials, baseUrl, params, fetchImpl }) {
  const response = await fetchImpl(
    buildOfficialUrl({ endpoint, credentials, baseUrl, params }),
    createReadonlyFetchOptions(),
  )

  if (!response.ok) {
    throw new Error(`Official endpoint "${endpoint}" returned HTTP ${response.status}.`)
  }

  return response.json()
}

function hasPayloadValue(payload, key) {
  return Boolean(payload && typeof payload === 'object' && key in payload)
}

function isPayloadReady(endpoint, payload) {
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
}) {
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

function readInstanceId(userDetails) {
  if (!userDetails || typeof userDetails !== 'object') {
    return null
  }

  const root = /** @type {Record<string, unknown>} */ (userDetails)
  const details = root.details && typeof root.details === 'object'
    ? /** @type {Record<string, unknown>} */ (root.details)
    : null
  const value = details?.instance_id ?? root.instance_id
  return value === null || value === undefined || value === '' ? null : String(value)
}

async function fetchPrivateUserProfilePayloadsFromBaseUrl({
  credentials,
  baseUrl,
  fetchImpl = fetch,
}) {
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

/** @param {FetchPrivateUserProfilePayloadsOptions} options */
export async function fetchPrivateUserProfilePayloads({
  credentials,
  baseUrl,
  fetchImpl = fetch,
}) {
  const baseUrls = await resolveOfficialPlayServerBaseUrls({ fetchImpl, baseUrl })

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

async function writeJson(targetPath, value) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

/** @param {FetchAndStorePrivateUserProfilePayloadsOptions} [options] */
export async function fetchAndStorePrivateUserProfilePayloads({
  envFile = DEFAULT_PRIVATE_ENV_FILE,
  baseUrl,
  latestDir = DEFAULT_PRIVATE_LATEST_DIR,
  payloadFilename = DEFAULT_PRIVATE_PAYLOAD_FILENAME,
  env = process.env,
  fetchImpl = fetch,
  cwd = process.cwd(),
} = {}) {
  const envFilePath = path.resolve(cwd, envFile)
  const envFileContent = await readOptionalEnvFile(envFilePath)
  const fileEnv = envFileContent ? parseLocalEnvFile(envFileContent) : {}
  const credentialsResult = loadPrivateCredentials({
    env: {
      ...fileEnv,
      ...env,
    },
  })

  if (credentialsResult.error || !credentialsResult.userId || !credentialsResult.hash) {
    throw new Error(credentialsResult.error ?? 'Missing private credentials.')
  }

  const credentials = {
    userId: credentialsResult.userId,
    hash: credentialsResult.hash,
  }
  const payloads = await fetchPrivateUserProfilePayloads({
    credentials,
    baseUrl,
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
