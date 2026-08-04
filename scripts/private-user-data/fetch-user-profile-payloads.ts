#!/usr/bin/env node

import process from 'node:process'
import {
  DEFAULT_PRIVATE_ENV_FILE,
  DEFAULT_PRIVATE_LATEST_DIR,
  fetchAndStorePrivateUserProfilePayloads,
} from './private-user-profile-payloads.ts'

interface ParsedArgs {
  envFile: string
  latestDir: string
  baseUrl?: string
  help?: boolean
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const args: ParsedArgs = {
    envFile: DEFAULT_PRIVATE_ENV_FILE,
    latestDir: DEFAULT_PRIVATE_LATEST_DIR,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? ''

    if (token === '--env-file') {
      args.envFile = argv[index + 1] ?? args.envFile
      index += 1
      continue
    }

    if (token === '--base-url') {
      const next = argv[index + 1]
      if (next !== undefined) {
        args.baseUrl = next
      }
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

function printHelp(): void {
  console.log(`
Usage:
  node scripts/private-user-data/fetch-user-profile-payloads.ts [options]

Options:
  --env-file <path>     Read ignored local credentials from this file. Default: ${DEFAULT_PRIVATE_ENV_FILE}
  --base-url <url>      Override the initial official play server base URL. Default: auto-discover current server.
  --latest-dir <path>   Override the dev-only latest snapshot directory. Default: ${DEFAULT_PRIVATE_LATEST_DIR}
  -h, --help            Show this help message.
`.trim())
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.help === true) {
    printHelp()
    return
  }

  const result = await fetchAndStorePrivateUserProfilePayloads({
    envFile: args.envFile,
    latestDir: args.latestDir,
    ...(args.baseUrl !== undefined ? { baseUrl: args.baseUrl } : {}),
  })

  console.log(`Private user payloads saved to ${result.manifest.outputDir} and ${args.latestDir}.`)
  console.log(`Masked credentials: ${result.manifest.maskedUserId} / ${result.manifest.maskedHash}`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Failed to fetch private user payloads: ${message}`)
  process.exitCode = 1
})
