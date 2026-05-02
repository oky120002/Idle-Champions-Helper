#!/usr/bin/env node

/**
 * privacy:scan — scans src/, public/, docs/, tests/, and dist/ (if present)
 * for credentials, private snapshots, and unsafe path references.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { scanContent } from './sensitive-output-scanner.mjs'

const SCAN_DIRS = ['src', 'public', 'docs', 'tests']
const IGNORE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'])

function* walkDir(dir) {
  if (!existsSync(dir)) return

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
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

  const dirs = [...SCAN_DIRS]
  if (existsSync('dist')) {
    dirs.push('dist')
  }

  for (const dir of dirs) {
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
