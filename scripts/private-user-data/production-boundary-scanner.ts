/**
 * Production boundary scanner — detects dev-only user-data markers that must
 * never appear in production build output.
 */

export type ProductionBoundaryFindingKind =
  | 'dev-endpoint-reference'
  | 'dev-source-reference'
  | 'private-path-reference'
  | 'dev-command-reference'

export interface ProductionBoundaryFinding {
  kind: ProductionBoundaryFindingKind
  filePath: string
  line: number
  match: string
  description: string
}

export interface ProductionBoundaryScanResult {
  filePath: string
  findings: ProductionBoundaryFinding[]
  hasFindings: boolean
}

export interface ProductionBoundaryInputFile {
  content: string
  filePath: string
}

interface ForbiddenBuildMarker {
  kind: ProductionBoundaryFindingKind
  pattern: RegExp
  description: string
}

const FORBIDDEN_BUILD_MARKERS: readonly ForbiddenBuildMarker[] = [
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
 */
export function scanBuildContent(
  content: string,
  filePath: string,
): ProductionBoundaryScanResult {
  const findings: ProductionBoundaryFinding[] = []
  const lines = content.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) break
    const lineNumber = index + 1

    for (const marker of FORBIDDEN_BUILD_MARKERS) {
      for (const match of line.matchAll(marker.pattern)) {
        findings.push({
          kind: marker.kind,
          line: lineNumber,
          match: match[0],
          description: marker.description,
          filePath,
        })
      }
    }
  }

  return { filePath, findings, hasFindings: findings.length > 0 }
}

export function scanBuildFiles(
  files: readonly ProductionBoundaryInputFile[],
): ProductionBoundaryScanResult[] {
  return files.map(({ content, filePath }) => scanBuildContent(content, filePath))
}
