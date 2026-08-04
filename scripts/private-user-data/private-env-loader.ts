/**
 * Private environment variable loader — reads local dev credentials from
 * process environment or explicit .local env files. Never exposes VITE_ keys.
 */

const USER_ID_KEY = 'IC_PRIVATE_USER_ID'
const HASH_KEY = 'IC_PRIVATE_HASH'
const FORBIDDEN_VITE_KEYS: ReadonlySet<string> = new Set([
  `VITE_${USER_ID_KEY}`,
  `VITE_${HASH_KEY}`,
])

export interface PrivateEnvSource {
  env: Record<string, string | undefined>
}

export interface PrivateCredentialsResult {
  userId?: string
  hash?: string
  error?: string
}

/**
 * Load private credentials from a provided env object.
 */
export function loadPrivateCredentials({ env }: PrivateEnvSource): PrivateCredentialsResult {
  const viteKeys = Object.keys(env).filter((key) => FORBIDDEN_VITE_KEYS.has(key))
  if (viteKeys.length > 0) {
    return {
      error: `Credential keys must not use VITE_ prefix (found: ${viteKeys.join(', ')}). VITE_ keys are exposed to browser builds.`,
    }
  }

  const userId = env[USER_ID_KEY]
  const hash = env[HASH_KEY]

  if ((userId === undefined || userId === '') || (hash === undefined || hash === '')) {
    const missing: string[] = []
    if (userId === undefined || userId === '') missing.push(USER_ID_KEY)
    if (hash === undefined || hash === '') missing.push(HASH_KEY)
    return {
      error: `Missing required credential(s): ${missing.join(', ')}. Set them in your environment or .env.local file.`,
    }
  }

  return { userId, hash }
}

/**
 * Parse .env-style file content into a flat key-value map.
 */
export function parseLocalEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}
