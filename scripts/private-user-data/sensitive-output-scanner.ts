/**
 * Sensitive output scanner — detects credentials, hashes, and private-data
 * path references that should never appear in committed source or build output.
 */

export type FindingKind = 'numeric-user-id' | 'hex-hash' | 'private-path-reference'

export interface SensitiveFinding {
  kind: FindingKind
  filePath: string
  line: number
  match: string
  description: string
}

export interface SensitiveScanResult {
  filePath: string
  findings: SensitiveFinding[]
  hasFindings: boolean
}

export interface SensitiveInputFile {
  content: string
  filePath: string
}

// 32-char lowercase hex string (MD5-style)
const HEX_HASH_RE = /\b[0-9a-f]{32}\b/gu

// Standalone 6-10 digit number that follows a credential-like key
const CREDENTIAL_VALUE_RE = /(?:user[_\s-]?id|hash|user_id|ic_private)\s*[:=]\s*(\d{6,10})\b/giu

// Path reference to tmp/private-user-data
const PRIVATE_PATH_RE = /tmp[/\\]private-user-data/gu

// Known desensitized sample values used in UI components
const KNOWN_SAMPLE_VALUES: ReadonlySet<string> = new Set([
  '123456789',
  'abcdef1234567890abcdef1234567890',
])

/**
 * Scan file content for sensitive data patterns.
 */
export function scanContent(content: string, filePath: string): SensitiveScanResult {
  const findings: SensitiveFinding[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line === undefined) break
    const lineNum = i + 1

    for (const match of line.matchAll(CREDENTIAL_VALUE_RE)) {
      const credential = match[1]
      if (credential === undefined) continue
      if (KNOWN_SAMPLE_VALUES.has(credential)) continue
      findings.push({
        kind: 'numeric-user-id',
        line: lineNum,
        match: credential,
        description: `Numeric credential value "${credential}" appears to be a real user ID or hash`,
        filePath,
      })
    }

    for (const match of line.matchAll(HEX_HASH_RE)) {
      const hexHash = match[0]
      if (KNOWN_SAMPLE_VALUES.has(hexHash)) continue
      findings.push({
        kind: 'hex-hash',
        line: lineNum,
        match: hexHash,
        description: `32-character hex hash "${hexHash}" looks like a real credential hash`,
        filePath,
      })
    }

    for (const match of line.matchAll(PRIVATE_PATH_RE)) {
      const pathRef = match[0]
      findings.push({
        kind: 'private-path-reference',
        line: lineNum,
        match: pathRef,
        description: `Reference to private data path "${pathRef}" should not appear in committed source`,
        filePath,
      })
    }
  }

  return { filePath, findings, hasFindings: findings.length > 0 }
}

/**
 * Scan multiple file contents.
 */
export function scanFiles(files: readonly SensitiveInputFile[]): SensitiveScanResult[] {
  return files.map(({ content, filePath }) => scanContent(content, filePath))
}
