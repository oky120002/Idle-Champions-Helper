#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { scanBuildContent } from './production-boundary-scanner.ts'

const DIST_DIR = 'dist'
const IGNORE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
])

function* walkDir(dir: string): Generator<string> {
  if (!existsSync(dir)) return

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      yield* walkDir(fullPath)
      continue
    }

    if (!stat.isFile()) {
      continue
    }

    const ext = fullPath.substring(fullPath.lastIndexOf('.'))
    if (!IGNORE_EXTENSIONS.has(ext)) {
      yield fullPath
    }
  }
}

function runScan(): void {
  if (!existsSync(DIST_DIR)) {
    console.error('Production boundary scan requires an existing dist/. Run `pnpm run build` first.')
    process.exit(1)
  }

  let totalFindings = 0

  for (const filePath of walkDir(DIST_DIR)) {
    try {
      const content = readFileSync(filePath, 'utf8')
      const result = scanBuildContent(content, filePath)

      if (!result.hasFindings) {
        continue
      }

      for (const finding of result.findings) {
        console.error(`[PROD-BOUNDARY] ${finding.filePath}:${String(finding.line)} — ${finding.description}`)
        totalFindings += 1
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (totalFindings > 0) {
    console.error(`\nProduction boundary scan found ${String(totalFindings)} issue(s).`)
    process.exit(1)
  }

  console.log('Production boundary scan passed — no dev-only private-data markers found in dist/.')
}

runScan()
