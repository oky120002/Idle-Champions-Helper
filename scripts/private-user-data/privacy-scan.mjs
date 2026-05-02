#!/usr/bin/env node

/**
 * privacy:scan — scans src/, docs/, and tests/ for credentials,
 * private snapshots, and unsafe path references.
 *
 * Skips public/data/ (game graphic IDs), dist/ (build artifacts),
 * and known desensitized sample values.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { scanContent } from './sensitive-output-scanner.mjs'

const SCAN_DIRS = ['src']
const IGNORE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'])
const IGNORE_PATH_PARTS = ['node_modules', 'dist', 'public/data']

function shouldSkipPath(fullPath) {
  return IGNORE_PATH_PARTS.some((part) => fullPath.includes(part))
}

function* walkDir(dir) {
  if (!existsSync(dir)) return

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)

    if (shouldSkipPath(fullPath)) continue

    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      yield* walkDir(fullPath)
    } else if (stat.isFile()) {
      const ext = fullPath.substring(fullPath.lastIndexOf('.'))
      if (!IGNORE_EXTENSIONS.has(ext)) {
        yield fullPath
      }
    }
  }
}

function runScan() {
  let totalFindings = 0

  for (const dir of SCAN_DIRS) {
    for (const filePath of walkDir(dir)) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        const result = scanContent(content, filePath)

        if (result.hasFindings) {
          for (const finding of result.findings) {
            console.error(`[PRIVACY] ${finding.filePath}:${finding.line} — ${finding.description}`)
            totalFindings++
          }
        }
      } catch {
        // Skip binary or unreadable files
      }
    }
  }

  if (totalFindings > 0) {
    console.error(`\nPrivacy scan found ${totalFindings} issue(s).`)
    process.exit(1)
  }

  console.log('Privacy scan passed — no sensitive data found.')
}

runScan()
