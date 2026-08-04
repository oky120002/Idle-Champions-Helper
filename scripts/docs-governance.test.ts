import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { unwrap } from '../tests/utils/dom-assertions.ts'

const repositoryRoot = resolve(import.meta.dirname, '..')
const docsRoot = resolve(repositoryRoot, 'docs')
const activeDocumentDirectories = ['specs', 'research', 'decisions', 'changes', 'runbooks']
const documentDirectories = [...activeDocumentDirectories, 'archive']

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
  it('keeps five active document types and archive as explicit top-level destinations', () => {
    for (const directory of documentDirectories) {
      expect(existsSync(resolve(docsRoot, directory)), `missing docs/${directory}/`).toBe(true)
    }

    for (const legacyDirectory of ['product', 'modules', 'investigations', 'troubleshooting']) {
      expect(existsSync(resolve(docsRoot, legacyDirectory)), `legacy docs/${legacyDirectory}/ remains`).toBe(false)
    }
  })

  it('keeps taxonomy wording aligned with the five active directories and archive', () => {
    const taxonomySources = [
      'docs/README.md',
      'docs/specs/guidelines/documentation-governance.md',
      'docs/decisions/0006-document-taxonomy.md',
      'docs/archive/audits/2026-07-document-restructure-audit.md',
    ]

    for (const source of taxonomySources) {
      const markdown = readFileSync(resolve(repositoryRoot, source), 'utf8')
      expect(markdown, `${source} must distinguish active documents from archive`).toContain(
        '五类活跃资产与一类历史归档',
      )
      expect(markdown, `${source} counts archive as an active document type`).not.toContain('六类活跃资产')
    }
  })

  it('keeps every local Markdown link resolvable', () => {
    const brokenLinks: string[] = []

    for (const file of markdownFiles(docsRoot)) {
      const markdown = readFileSync(file, 'utf8')
      // eslint-disable-next-line sonarjs/super-linear-regex -- 两个互斥字符类量词无嵌套无重叠，star-height=1，实测无回溯爆炸；保留原字符集以维持对跨行链接的覆盖
      for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const rawTarget = match[1]?.trim().replace(/^<|>$/g, '') ?? ''
        if (rawTarget === '' || /^(?:https?:|mailto:|#)/.test(rawTarget)) continue

        const target = decodeURI(rawTarget.split('#')[0] ?? '')
        if (target !== '' && !existsSync(resolve(dirname(file), target))) {
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
      if (lineCount > limit) oversized.push(`${relativeToRepository(file)}: ${String(lineCount)} > ${String(limit)}`)
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
        if (target != null && target !== '' && !existsSync(resolve(repositoryRoot, target))) missingTargets.push(target)
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

  it('keeps Change lifecycle statuses unambiguous before and after archival', () => {
    const invalidActiveChanges: string[] = []
    const invalidArchivedChanges: string[] = []

    for (const file of markdownFiles(resolve(docsRoot, 'changes')).filter((path) => !path.endsWith('/README.md') && !path.endsWith('/_template.md'))) {
      const markdown = readFileSync(file, 'utf8')
      if (!/^\*\*Status\*\*: (?:Draft|Accepted)$/m.test(markdown)) invalidActiveChanges.push(relativeToRepository(file))
    }

    for (const file of markdownFiles(resolve(docsRoot, 'archive/changes')).filter((path) => !path.endsWith('/README.md'))) {
      const markdown = readFileSync(file, 'utf8')
      if (!/^\*\*Status\*\*: Landed$/m.test(markdown)) invalidArchivedChanges.push(relativeToRepository(file))
    }

    expect(invalidActiveChanges).toEqual([])
    expect(invalidArchivedChanges).toEqual([])
  })

  it('does not promise a template for document types that use directory guidance instead', () => {
    const governance = readFileSync(resolve(docsRoot, 'specs/guidelines/documentation-governance.md'), 'utf8')

    expect(governance).not.toContain('模板见各目录')
    expect(governance).toContain('Decision 和 Change 使用各自目录的 `_template.md`')
  })

  it('keeps active navigation free of unfinished phase narration', () => {
    const unfinishedNavigation: string[] = []

    for (const file of markdownFiles(docsRoot).filter((path) => path.endsWith('/README.md') && !path.includes('/archive/'))) {
      const markdown = readFileSync(file, 'utf8')
      if (/(?:阶段 \d+|待补|将(?:在)?阶段.*补全)/.test(markdown)) unfinishedNavigation.push(relativeToRepository(file))
    }

    expect(unfinishedNavigation).toEqual([])
  })

  it('keeps Research free of explicit implementation to-dos', () => {
    const researchToDos = markdownFiles(resolve(docsRoot, 'research'))
      .filter((file) => /^- 待办：/m.test(readFileSync(file, 'utf8')))
      .map(relativeToRepository)

    expect(researchToDos).toEqual([])
  })

  it('keeps project decisions out of Research evidence documents', () => {
    const evidenceDocuments = [
      'docs/research/deployment/china-hosting/access-optimization.md',
      'docs/research/deployment/china-hosting/options-and-filing.md',
      'docs/research/data/visual-asset/size-and-storage.md',
      'docs/research/data/game-data-source/implementation-and-risks.md',
    ]
    const decisionNarrative = /(?:当前不进入实现范围|不是默认方案|不建议回退成|必须自做 schema 校验|不应成为正式上游)/

    for (const source of evidenceDocuments) {
      const markdown = readFileSync(resolve(repositoryRoot, source), 'utf8')
      expect(markdown, `${source} must not restate a project decision`).not.toMatch(decisionNarrative)
    }

    expect(
      readFileSync(resolve(repositoryRoot, unwrap(evidenceDocuments[0], '缺少 evidence document 0')), 'utf8'),
    ).toContain('decisions/0005-deployment-github-pages.md')
    expect(
      readFileSync(resolve(repositoryRoot, unwrap(evidenceDocuments[3], '缺少 evidence document 3')), 'utf8'),
    ).toContain('decisions/0002-data-source-strategy.md')
  })

  it('keeps illustration research aligned with the published static and animated asset contract', () => {
    const implementation = readFileSync(
      resolve(docsRoot, 'research/data/skin-illustration/implementation.md'),
      'utf8',
    )
    const pipeline = readFileSync(
      resolve(docsRoot, 'research/data/skin-illustration/pipeline.md'),
      'utf8',
    )

    expect(implementation).toContain('`.bin` + manifest')
    expect(implementation).toContain('静态 PNG')
    expect(implementation).not.toContain('丢掉其余动画数据')
    expect(pipeline).toContain('浏览器不会直连官方资源')
  })

  it('keeps active Spec titles as current contracts instead of implementation plans', () => {
    const plannedTitles: string[] = []

    for (const file of markdownFiles(resolve(docsRoot, 'specs'))) {
      const title = /^# (.+)$/m.exec(readFileSync(file, 'utf8'))?.[1] ?? ''
      if (/(?:目标架构|设计稿|实施边界)/.test(title)) plannedTitles.push(relativeToRepository(file))
    }

    expect(plannedTitles).toEqual([])
  })

  it('keeps every top-level document directory navigable', () => {
    for (const directory of documentDirectories) {
      const readme = resolve(docsRoot, directory, 'README.md')
      expect(existsSync(readme), `missing docs/${directory}/README.md`).toBe(true)
    }
  })
})
