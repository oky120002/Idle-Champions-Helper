import fs from 'node:fs/promises'
import path from 'node:path'
import { loadPrivateCredentials, parseLocalEnvFile } from './private-env-loader.mjs'
import { createManifest, writeManifest } from './private-snapshot-manifest.mjs'

const DEFAULT_ENV_FILE = '.env.private-user.local'
const DEFAULT_BASE_URL = 'https://ps21.idlechampions.com/~idledragons/'
const DEFAULT_MOBILE_CLIENT_VERSION = '999'
const DEFAULT_LATEST_DIR = 'tmp/private-user-data/latest'
const ALLOWED_ENDPOINTS = new Set([
  'getuserdetails',
  'getcampaigndetails',
  'getallformationsaves',
])

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_ENV_FILE,
    baseUrl: DEFAULT_BASE_URL,
    latestDir: DEFAULT_LATEST_DIR,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (token === '--env-file') {
      args.envFile = argv[index + 1] ?? args.envFile
      index += 1
      continue
    }

    if (token === '--base-url') {
      args.baseUrl = argv[index + 1] ?? args.baseUrl
      index += 1
      continue
    }

    if (token === '--latest-dir') {
      args.latestDir = argv[index + 1] ?? args.latestDir
      index += 1
      continue
    }

    if (token === '--help' || token === '-h') {
      args.help = true
    }
  }

  return args
}

function printHelp() {
  console.log(`
Usage:
  node scripts/private-user-data/fetch-user-profile-payloads.mjs [options]

Options:
  --env-file <path>     Read ignored local credentials from this file. Default: ${DEFAULT_ENV_FILE}
  --base-url <url>      Override official play server base URL.
  --latest-dir <path>   Override the dev-only latest snapshot directory. Default: ${DEFAULT_LATEST_DIR}
  -h, --help            Show this help message.
`.trim())
}

async function readOptionalEnvFile(envFile) {
  try {
    return await fs.readFile(envFile, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

function buildOfficialUrl({ endpoint, credentials, baseUrl, params = {} }) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    throw new Error(`Endpoint "${endpoint}" is not allowed for private dev fetches.`)
  }

  const url = new URL('post.php', baseUrl)
  url.searchParams.set('call', endpoint)
  url.searchParams.set('user_id', credentials.userId)
  url.searchParams.set('hash', credentials.hash)
  url.searchParams.set('mobile_client_version', DEFAULT_MOBILE_CLIENT_VERSION)

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

function createReadonlyFetchOptions() {
  return {
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  }
}

async function fetchReadonlyJson({ endpoint, credentials, baseUrl, params }) {
  const response = await fetch(
    buildOfficialUrl({ endpoint, credentials, baseUrl, params }),
    createReadonlyFetchOptions(),
  )

  if (!response.ok) {
    throw new Error(`Official endpoint "${endpoint}" returned HTTP ${response.status}.`)
  }

  return response.json()
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

async function fetchUserProfilePayloads({ credentials, baseUrl }) {
  const userDetails = await fetchReadonlyJson({
    endpoint: 'getuserdetails',
    credentials,
    baseUrl,
    params: { instance_key: '1' },
  })
  const campaignDetails = await fetchReadonlyJson({
    endpoint: 'getcampaigndetails',
    credentials,
    baseUrl,
    params: { game_instance_id: '1', instance_id: '1' },
  })
  const formationSaves = await fetchReadonlyJson({
    endpoint: 'getallformationsaves',
    credentials,
    baseUrl,
    params: { instance_id: readInstanceId(userDetails) },
  })

  return {
    userDetails,
    campaignDetails,
    formationSaves,
  }
}

async function writeJson(targetPath, value) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const envFileContent = await readOptionalEnvFile(args.envFile)
  const fileEnv = envFileContent ? parseLocalEnvFile(envFileContent) : {}
  const credentialsResult = loadPrivateCredentials({
    env: {
      ...fileEnv,
      ...process.env,
    },
  })

  if (credentialsResult.error || !credentialsResult.userId || !credentialsResult.hash) {
    throw new Error(credentialsResult.error ?? 'Missing private credentials.')
  }

  const payloads = await fetchUserProfilePayloads({
    credentials: {
      userId: credentialsResult.userId,
      hash: credentialsResult.hash,
    },
    baseUrl: args.baseUrl,
  })

  const manifest = createManifest({
    payloadName: 'user-profile-payloads.json',
    userId: credentialsResult.userId,
    hash: credentialsResult.hash,
  })
  writeManifest({ targetDir: manifest.outputDir, manifest })
  writeManifest({ targetDir: args.latestDir, manifest })

  const timestampDir = path.resolve(process.cwd(), manifest.outputDir)
  const latestDir = path.resolve(process.cwd(), args.latestDir)
  const payloadFilename = 'user-profile-payloads.json'

  await writeJson(path.join(timestampDir, payloadFilename), payloads)
  await writeJson(path.join(timestampDir, 'manifest.json'), manifest)
  await fs.rm(latestDir, { recursive: true, force: true })
  await writeJson(path.join(latestDir, payloadFilename), payloads)
  await writeJson(path.join(latestDir, 'manifest.json'), manifest)

  console.log(`Private user payloads saved to ${manifest.outputDir} and ${args.latestDir}.`)
  console.log(`Masked credentials: ${manifest.maskedUserId} / ${manifest.maskedHash}`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Failed to fetch private user payloads: ${message}`)
  process.exitCode = 1
})
