import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '..')
const docsRoot = resolve(repositoryRoot, 'docs')

function markdownFiles(root: string): string[] {
  if (!existsSync(root)) return []

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.isFile() && extname(entry.name) === '.md' ? [path] : []
  })
}

function relativeToRepository(path: string): string {
  return path.slice(repositoryRoot.length + 1)
}

describe('documentation governance', () => {
  it('keeps the six active document types and archive as explicit top-level destinations', () => {
    for (const directory of ['specs', 'research', 'decisions', 'changes', 'runbooks', 'archive']) {
      expect(existsSync(resolve(docsRoot, directory)), `missing docs/${directory}/`).toBe(true)
    }

    for (const legacyDirectory of ['product', 'modules', 'investigations', 'troubleshooting']) {
      expect(existsSync(resolve(docsRoot, legacyDirectory)), `legacy docs/${legacyDirectory}/ remains`).toBe(false)
    }
  })

  it('keeps every local Markdown link resolvable', () => {
    const brokenLinks: string[] = []

    for (const file of markdownFiles(docsRoot)) {
      const markdown = readFileSync(file, 'utf8')
      for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const rawTarget = match[1]?.trim().replace(/^<|>$/g, '') ?? ''
        if (!rawTarget || /^(?:https?:|mailto:|#)/.test(rawTarget)) continue

        const target = decodeURI(rawTarget.split('#')[0] ?? '')
        if (target && !existsSync(resolve(dirname(file), target))) {
          brokenLinks.push(`${relativeToRepository(file)} -> ${rawTarget}`)
        }
      }
    }

    expect(brokenLinks).toEqual([])
  })

  it('keeps active navigation and leaf documents within hard context budgets', () => {
    const oversized: string[] = []

    for (const file of markdownFiles(docsRoot).filter((path) => !path.includes('/archive/'))) {
      const lineCount = readFileSync(file, 'utf8').split('\n').length
      const limit = file.endsWith('/README.md') ? 90 : 180
      if (lineCount > limit) oversized.push(`${relativeToRepository(file)}: ${lineCount} > ${limit}`)
    }

    expect(oversized).toEqual([])
  })

  it('keeps module and product specs free of change narrative', () => {
    const polluted: string[] = []
    const forbidden = [
      /^## .*?(?:未来|后续|实施拆分|扩展顺序|待办)/m,
      /本次讨论|重构设计稿|当前阶段建议|若后续要|留后续/,
      /docs\/changes\//,
    ]

    for (const directory of ['modules', 'product']) {
      for (const file of markdownFiles(resolve(docsRoot, 'specs', directory))) {
        const markdown = readFileSync(file, 'utf8')
        if (forbidden.some((pattern) => pattern.test(markdown))) polluted.push(relativeToRepository(file))
      }
    }

    expect(polluted).toEqual([])
  })

  it('does not reintroduce retired document names into active documentation', () => {
    const retiredNames = [
      'workbench-shell-redesign-design.md',
      'user-data-import-design.md',
      'data-source-confirmations.md',
      'bud-verification.md',
      'buff-upgrade-priority.md',
    ]
    const activeFiles = markdownFiles(docsRoot).filter((path) => !path.includes('/archive/'))

    for (const retiredName of retiredNames) {
      expect(
        activeFiles.some((path) => path.endsWith(`/${retiredName}`)),
        `retired document returned: ${retiredName}`,
      ).toBe(false)
    }
  })

  it('keeps every destination in the 128-document migration ledger resolvable', () => {
    const auditPath = resolve(
      docsRoot,
      'archive/audits/2026-07-document-restructure-audit.md',
    )
    const rows = readFileSync(auditPath, 'utf8')
      .split('\n')
      .filter((line) => /^\| \d+ \|/.test(line))
    const missingTargets: string[] = []

    expect(rows).toHaveLength(128)

    for (const row of rows) {
      const targetCell = row.split('|')[3] ?? ''
      for (const match of targetCell.matchAll(/`(docs\/[^`]+\.md)`/g)) {
        const target = match[1]
        if (target && !existsSync(resolve(repositoryRoot, target))) missingTargets.push(target)
      }
    }

    expect(missingTargets).toEqual([])
  })

  it('requires lifecycle status on decisions and changes', () => {
    const missingStatus: string[] = []

    for (const directory of ['decisions', 'changes']) {
      for (const file of markdownFiles(resolve(docsRoot, directory))) {
        if (file.endsWith('/README.md') || extname(file) !== '.md') continue
        if (!readFileSync(file, 'utf8').includes('**Status**:')) {
          missingStatus.push(relativeToRepository(file))
        }
      }
    }

    expect(missingStatus).toEqual([])
  })

  it('keeps every top-level document directory navigable', () => {
    for (const directory of ['specs', 'research', 'decisions', 'changes', 'runbooks', 'archive']) {
      const readme = resolve(docsRoot, directory, 'README.md')
      expect(existsSync(readme), `missing docs/${directory}/README.md`).toBe(true)
    }
  })
})
