/**
 * Sensitive output scanner — detects credentials, hashes, and private-data
 * path references that should never appear in committed source or build output.
 */

/** @typedef {'numeric-user-id' | 'hex-hash' | 'private-path-reference'} FindingKind */

/** @typedef {{kind: FindingKind, filePath: string, line: number, match: string, description: string}} SensitiveFinding */

/** @typedef {{filePath: string, findings: SensitiveFinding[], hasFindings: boolean}} SensitiveScanResult */

// 32-char lowercase hex string (MD5-style)
const HEX_HASH_RE = /\b[0-9a-f]{32}\b/gu

// Standalone 6-10 digit number that follows a credential-like key
const CREDENTIAL_VALUE_RE = /(?:user[_\s-]?id|hash|user_id|ic_private)\s*[:=]\s*(\d{6,10})\b/giu

// Path reference to tmp/private-user-data
const PRIVATE_PATH_RE = /tmp[/\\]private-user-data/gu

/**
 * Scan file content for sensitive data patterns.
 *
 * @param {string} content - File content to scan.
 * @param {string} filePath - Logical file path (for reporting).
 * @returns {SensitiveScanResult}
 */
export function scanContent(content, filePath) {
  /** @type {SensitiveFinding[]} */
  const findings = []

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Check for credential-like numeric values
    for (const match of line.matchAll(CREDENTIAL_VALUE_RE)) {
      findings.push({
        kind: 'numeric-user-id',
        filePath,
        line: lineNum,
        match: match[1],
        description: `Numeric credential value "${match[1]}" appears to be a real user ID or hash`,
      })
    }

    // Check for 32-char hex hashes
    for (const match of line.matchAll(HEX_HASH_RE)) {
      findings.push({
        kind: 'hex-hash',
        filePath,
        line: lineNum,
        match: match[0],
        description: `32-character hex hash "${match[0]}" looks like a real credential hash`,
      })
    }

    // Check for private data path references
    for (const match of line.matchAll(PRIVATE_PATH_RE)) {
      findings.push({
        kind: 'private-path-reference',
        filePath,
        line: lineNum,
        match: match[0],
        description: `Reference to private data path "${match[0]}" should not appear in committed source`,
      })
    }
  }

  return { filePath, findings, hasFindings: findings.length > 0 }
}

/**
 * Scan multiple file contents.
 *
 * @param {{content: string, filePath: string}[]} files
 * @returns {SensitiveScanResult[]}
 */
export function scanFiles(files) {
  return files.map(({ content, filePath }) => scanContent(content, filePath))
}
