/**
 * Production boundary scanner — detects dev-only user-data markers that must
 * never appear in production build output.
 */

/** @typedef {'dev-endpoint-reference' | 'dev-source-reference' | 'private-path-reference' | 'dev-command-reference'} ProductionBoundaryFindingKind */

/** @typedef {{kind: ProductionBoundaryFindingKind, filePath: string, line: number, match: string, description: string}} ProductionBoundaryFinding */

/** @typedef {{filePath: string, findings: ProductionBoundaryFinding[], hasFindings: boolean}} ProductionBoundaryScanResult */

const FORBIDDEN_BUILD_MARKERS = [
  {
    kind: 'dev-endpoint-reference',
    pattern: /__dev\/private-user-data\/[a-z-]+/gu,
    description: 'Dev-only private snapshot endpoint leaked into production output',
  },
  {
    kind: 'dev-source-reference',
    pattern: /\blocal-dev-snapshot\b/gu,
    description: 'Dev-only user profile source leaked into production output',
  },
  {
    kind: 'private-path-reference',
    pattern: /tmp[/\\]private-user-data/gu,
    description: 'Private local data path leaked into production output',
  },
  {
    kind: 'dev-command-reference',
    pattern: /private-user-data:fetch/gu,
    description: 'Dev-only private fetch command leaked into production output',
  },
  {
    kind: 'dev-source-reference',
    pattern: /本地开发快照/gu,
    description: 'Dev-only private snapshot UI copy leaked into production output',
  },
  {
    kind: 'dev-source-reference',
    pattern: /当前开发数据源/gu,
    description: 'Dev-only profile source selector UI copy leaked into production output',
  },
]

/**
 * Scan built content for production boundary violations.
 *
 * @param {string} content
 * @param {string} filePath
 * @returns {ProductionBoundaryScanResult}
 */
export function scanBuildContent(content, filePath) {
  /** @type {ProductionBoundaryFinding[]} */
  const findings = []
  const lines = content.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineNumber = index + 1

    for (const marker of FORBIDDEN_BUILD_MARKERS) {
      for (const match of line.matchAll(marker.pattern)) {
        findings.push({
          kind: marker.kind,
          filePath,
          line: lineNumber,
          match: match[0],
          description: marker.description,
        })
      }
    }
  }

  return { filePath, findings, hasFindings: findings.length > 0 }
}

/**
 * @param {{content: string, filePath: string}[]} files
 * @returns {ProductionBoundaryScanResult[]}
 */
export function scanBuildFiles(files) {
  return files.map(({ content, filePath }) => scanBuildContent(content, filePath))
}
