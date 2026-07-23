import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'

const DEFAULT_OUT_DIR = 'tmp/idle-champions-api'
const DEFAULT_MASTER_API_URL = 'https://master.idlechampions.com/~idledragons/'
const DEFAULT_PLAYSERVER_CLIENT_VERSION = '999'
const DEFAULT_DEFINITIONS_CLIENT_VERSION = '99999'

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function buildFileSuffix(languageId: unknown, fileLabel?: string): string {
  const langText = typeof languageId === 'string' || typeof languageId === 'number' ? languageId : null
  const langPart = langText ? `lang-${langText}` : ''
  const rawValue = fileLabel ?? langPart
  const normalized = String(rawValue)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized ? `-${normalized}` : ''
}

function buildTimestampLabel(date: Date): string {
  return date.toISOString().replaceAll(':', '-')
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${response.statusText}`)
  }

  return response.json()
}

export interface FetchDefinitionsOptions {
  masterApiUrl?: string | undefined
  playserverClientVersion?: string | number | undefined
  definitionsClientVersion?: string | number | undefined
  languageId?: string | number | undefined
  fileLabel?: string | undefined
  outDir?: string | undefined
}

export interface FetchDefinitionsMeta {
  fetchedAt: string
  discoveryUrl: string
  definitionsUrl: string
  playServer: string
  playserverClientVersion: string
  definitionsClientVersion: string
  languageId: string | null
}

export interface FetchDefinitionsPayloadResult {
  definitionsPayload: unknown
  meta: FetchDefinitionsMeta
  playServer: string
  fetchedAt: string
  discoveryUrl: string
  definitionsUrl: string
}

export async function fetchDefinitionsPayload(
  options: FetchDefinitionsOptions = {},
): Promise<FetchDefinitionsPayloadResult> {
  const masterApiUrl = ensureTrailingSlash(options.masterApiUrl ?? DEFAULT_MASTER_API_URL)
  const playserverClientVersion = String(
    options.playserverClientVersion ?? DEFAULT_PLAYSERVER_CLIENT_VERSION,
  )
  const definitionsClientVersion = String(
    options.definitionsClientVersion ?? DEFAULT_DEFINITIONS_CLIENT_VERSION,
  )
  const languageId = options.languageId ? String(options.languageId) : null

  const discoveryQuery = new URLSearchParams({
    call: 'getPlayServerForDefinitions',
    mobile_client_version: playserverClientVersion,
    network_id: '11',
  })
  const discoveryUrl = `${masterApiUrl}post.php?${discoveryQuery.toString()}`
  const discoveryPayload = await fetchJson(discoveryUrl)
  const playServerRaw = (discoveryPayload as Record<string, unknown>).play_server
  const playServer = ensureTrailingSlash(typeof playServerRaw === 'string' ? playServerRaw : '')

  if (!playServer) {
    throw new Error('未从 getPlayServerForDefinitions 返回中拿到 play_server')
  }

  const definitionsQuery = new URLSearchParams({
    call: 'getDefinitions',
    new_achievements: '1',
    mobile_client_version: definitionsClientVersion,
  })

  if (languageId) {
    definitionsQuery.set('language_id', languageId)
  }

  const definitionsUrl = `${playServer}post.php?${definitionsQuery.toString()}`
  const definitionsPayload = await fetchJson(definitionsUrl)
  const fetchedAt = new Date()
  const meta: FetchDefinitionsMeta = {
    fetchedAt: fetchedAt.toISOString(),
    discoveryUrl,
    definitionsUrl,
    playServer,
    playserverClientVersion,
    definitionsClientVersion,
    languageId,
  }

  return {
    definitionsPayload,
    meta,
    playServer,
    fetchedAt: meta.fetchedAt,
    discoveryUrl,
    definitionsUrl,
  }
}

export interface FetchDefinitionsSnapshotResult {
  rawFile: string
  metaFile: string
  playServer: string
  fetchedAt: string
  discoveryUrl: string
  definitionsUrl: string
}

export async function fetchDefinitionsSnapshot(
  options: FetchDefinitionsOptions = {},
): Promise<FetchDefinitionsSnapshotResult> {
  const outDir = path.resolve(options.outDir ?? DEFAULT_OUT_DIR)
  const fileSuffix = buildFileSuffix(options.languageId, options.fileLabel)
  const fetched = await fetchDefinitionsPayload(options)

  const stamp = buildTimestampLabel(new Date(fetched.fetchedAt))

  await mkdir(outDir, { recursive: true })

  const rawFile = path.join(outDir, `definitions-${stamp}${fileSuffix}.json`)
  const metaFile = path.join(outDir, `definitions-${stamp}${fileSuffix}.meta.json`)

  await writeFile(rawFile, `${JSON.stringify(fetched.definitionsPayload, null, 2)}\n`, 'utf8')
  await writeFile(metaFile, `${JSON.stringify(fetched.meta, null, 2)}\n`, 'utf8')

  return {
    rawFile,
    metaFile,
    playServer: fetched.playServer,
    fetchedAt: fetched.meta.fetchedAt,
    discoveryUrl: fetched.discoveryUrl,
    definitionsUrl: fetched.definitionsUrl,
  }
}

function printUsage(): void {
  console.log(`用法：
  node scripts/fetch-idle-champions-definitions.mjs [--outDir <dir>] [--masterApiUrl <url>]

可选参数：
  --outDir <dir>                     原始 definitions 快照输出目录，默认 ${DEFAULT_OUT_DIR}
  --masterApiUrl <url>               Play server 发现接口根地址
  --playserverClientVersion <n>      getPlayServerForDefinitions 使用的客户端版本，默认 ${DEFAULT_PLAYSERVER_CLIENT_VERSION}
  --definitionsClientVersion <n>     getDefinitions 使用的客户端版本，默认 ${DEFAULT_DEFINITIONS_CLIENT_VERSION}
  --languageId <id>                  getDefinitions 使用的 language_id，例如 7 表示官方中文
  --fileLabel <label>                文件名附加后缀，便于区分多语言快照
  --help                             显示帮助
`)
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      outDir: { type: 'string' },
      masterApiUrl: { type: 'string' },
      playserverClientVersion: { type: 'string' },
      definitionsClientVersion: { type: 'string' },
      languageId: { type: 'string' },
      fileLabel: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    printUsage()
    return
  }

  const result = await fetchDefinitionsSnapshot(values)

  console.log(`Definitions 原始快照已写出：`)
  console.log(`- JSON: ${result.rawFile}`)
  console.log(`- Meta: ${result.metaFile}`)
  console.log(`- Play server: ${result.playServer}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error: unknown) => {
    console.error(`抓取 definitions 失败：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
