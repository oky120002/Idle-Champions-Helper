import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'

const DEFAULT_OUT_DIR = 'tmp/idle-champions-api'
const DEFAULT_MASTER_API_URL = 'https://master.idlechampions.com/~idledragons/'
const DEFAULT_PLAYSERVER_CLIENT_VERSION = '999'
const DEFAULT_DEFINITIONS_CLIENT_VERSION = '99999'

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

function buildTimestampLabel(date) {
  return date.toISOString().replaceAll(':', '-')
}

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function fetchDefinitionsSnapshot(options = {}) {
  const outDir = path.resolve(options.outDir ?? DEFAULT_OUT_DIR)
  const masterApiUrl = ensureTrailingSlash(options.masterApiUrl ?? DEFAULT_MASTER_API_URL)
  const playserverClientVersion = String(
    options.playserverClientVersion ?? DEFAULT_PLAYSERVER_CLIENT_VERSION,
  )
  const definitionsClientVersion = String(
    options.definitionsClientVersion ?? DEFAULT_DEFINITIONS_CLIENT_VERSION,
  )

  const discoveryQuery = new URLSearchParams({
    call: 'getPlayServerForDefinitions',
    mobile_client_version: playserverClientVersion,
    network_id: '11',
  })
  const discoveryUrl = `${masterApiUrl}post.php?${discoveryQuery.toString()}`
  const discoveryPayload = await fetchJson(discoveryUrl)
  const playServer = ensureTrailingSlash(discoveryPayload.play_server ?? '')

  if (!playServer) {
    throw new Error('未从 getPlayServerForDefinitions 返回中拿到 play_server')
  }

  const definitionsQuery = new URLSearchParams({
    call: 'getDefinitions',
    new_achievements: '1',
    mobile_client_version: definitionsClientVersion,
  })
  const definitionsUrl = `${playServer}post.php?${definitionsQuery.toString()}`
  const definitionsPayload = await fetchJson(definitionsUrl)

  const fetchedAt = new Date()
  const stamp = buildTimestampLabel(fetchedAt)

  await mkdir(outDir, { recursive: true })

  const rawFile = path.join(outDir, `definitions-${stamp}.json`)
  const metaFile = path.join(outDir, `definitions-${stamp}.meta.json`)

  const meta = {
    fetchedAt: fetchedAt.toISOString(),
    discoveryUrl,
    definitionsUrl,
    playServer,
    playserverClientVersion,
    definitionsClientVersion,
  }

  await writeFile(rawFile, `${JSON.stringify(definitionsPayload, null, 2)}\n`, 'utf8')
  await writeFile(metaFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')

  return {
    rawFile,
    metaFile,
    playServer,
    fetchedAt: meta.fetchedAt,
    discoveryUrl,
    definitionsUrl,
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/fetch-idle-champions-definitions.mjs [--outDir <dir>] [--masterApiUrl <url>]

可选参数：
  --outDir <dir>                     原始 definitions 快照输出目录，默认 ${DEFAULT_OUT_DIR}
  --masterApiUrl <url>               Play server 发现接口根地址
  --playserverClientVersion <n>      getPlayServerForDefinitions 使用的客户端版本，默认 ${DEFAULT_PLAYSERVER_CLIENT_VERSION}
  --definitionsClientVersion <n>     getDefinitions 使用的客户端版本，默认 ${DEFAULT_DEFINITIONS_CLIENT_VERSION}
  --help                             显示帮助
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      outDir: { type: 'string' },
      masterApiUrl: { type: 'string' },
      playserverClientVersion: { type: 'string' },
      definitionsClientVersion: { type: 'string' },
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`抓取 definitions 失败：${error.message}`)
    process.exitCode = 1
  })
}
