import {
  DEFAULT_PRIVATE_ENV_FILE,
  DEFAULT_PRIVATE_LATEST_DIR,
  fetchAndStorePrivateUserProfilePayloads,
} from './private-user-profile-payloads.mjs'

function parseArgs(argv) {
  const args = {
    envFile: DEFAULT_PRIVATE_ENV_FILE,
    latestDir: DEFAULT_PRIVATE_LATEST_DIR,
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
  --env-file <path>     Read ignored local credentials from this file. Default: ${DEFAULT_PRIVATE_ENV_FILE}
  --base-url <url>      Override the initial official play server base URL. Default: auto-discover current server.
  --latest-dir <path>   Override the dev-only latest snapshot directory. Default: ${DEFAULT_PRIVATE_LATEST_DIR}
  -h, --help            Show this help message.
`.trim())
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const result = await fetchAndStorePrivateUserProfilePayloads({
    envFile: args.envFile,
    baseUrl: args.baseUrl,
    latestDir: args.latestDir,
  })

  console.log(`Private user payloads saved to ${result.manifest.outputDir} and ${args.latestDir}.`)
  console.log(`Masked credentials: ${result.manifest.maskedUserId} / ${result.manifest.maskedHash}`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Failed to fetch private user payloads: ${message}`)
  process.exitCode = 1
})
