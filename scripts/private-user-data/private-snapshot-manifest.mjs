/**
 * Private snapshot manifest — safely writes metadata for local user data snapshots.
 * Output is always confined to tmp/private-user-data/<timestamp>/.
 */

const ALLOWED_PREFIX = 'tmp/private-user-data'
const ALLOWED_PREFIX_WIN = 'tmp\\private-user-data'

/**
 * Create a manifest object with masked credentials.
 *
 * @param {{payloadName: string, userId: string, hash: string}} options
 * @returns {{payloadName: string, timestamp: string, outputDir: string, maskedUserId: string, maskedHash: string}}
 */
export function createManifest({ payloadName, userId, hash }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputDir = `tmp/private-user-data/${timestamp}`

  return {
    payloadName,
    timestamp,
    outputDir,
    maskedUserId: `****${userId.slice(-4)}`,
    maskedHash: `****${hash.slice(-4)}`,
  }
}

/**
 * Validate that a target directory is inside tmp/private-user-data.
 *
 * @param {{targetDir: string, manifest: object}} options
 * @throws {Error} if the target directory is outside the allowed path
 */
export function writeManifest({ targetDir, manifest }) {
  if (!targetDir) {
    throw new Error('Target directory must not be empty')
  }

  const normalized = targetDir.replace(/\\/g, '/')
  if (
    !normalized.startsWith(ALLOWED_PREFIX) &&
    !targetDir.startsWith(ALLOWED_PREFIX_WIN)
  ) {
    throw new Error(
      `Manifest output must be inside ${ALLOWED_PREFIX}/, got: "${targetDir}"`,
    )
  }

  // In a real implementation, this would write to disk.
  // For now, it validates the path constraint.
}
