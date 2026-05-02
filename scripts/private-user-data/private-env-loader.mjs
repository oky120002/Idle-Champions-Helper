/**
 * Private environment variable loader — reads local dev credentials from
 * process environment or explicit .local env files. Never exposes VITE_ keys.
 */

const USER_ID_KEY = 'IC_PRIVATE_USER_ID'
const HASH_KEY = 'IC_PRIVATE_HASH'

/**
 * Load private credentials from a provided env object.
 *
 * @param {{env: Record<string, string | undefined>}} options
 * @returns {{userId?: string, hash?: string, error?: string}}
 */
export function loadPrivateCredentials({ env }) {
  const viteKeys = Object.keys(env).filter((k) => k.startsWith('VITE_'))
  if (viteKeys.length > 0) {
    return {
      error: `Credential keys must not use VITE_ prefix (found: ${viteKeys.join(', ')}). VITE_ keys are exposed to browser builds.`,
    }
  }

  const userId = env[USER_ID_KEY]
  const hash = env[HASH_KEY]

  if (!userId || !hash) {
    const missing = []
    if (!userId) missing.push(USER_ID_KEY)
    if (!hash) missing.push(HASH_KEY)
    return {
      error: `Missing required credential(s): ${missing.join(', ')}. Set them in your environment or .env.local file.`,
    }
  }

  return { userId, hash }
}

/**
 * Parse .env-style file content into a flat key-value map.
 *
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseLocalEnvFile(content) {
  /** @type {Record<string, string>} */
  const result = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}
