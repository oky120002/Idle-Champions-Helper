declare module './scripts/private-user-data/private-user-profile-payloads.mjs' {
  export const DEFAULT_PRIVATE_ENV_FILE: string
  export const DEFAULT_PRIVATE_BASE_URL: string
  export const DEFAULT_PRIVATE_MOBILE_CLIENT_VERSION: string
  export const DEFAULT_PRIVATE_LATEST_DIR: string
  export const DEFAULT_PRIVATE_PAYLOAD_FILENAME: string
  export const PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS: string[]

  export function buildOfficialUrl(options: {
    endpoint: string
    credentials: { userId: string; hash: string }
    baseUrl: string
    params?: Record<string, string | number | boolean | null | undefined>
  }): string

  export function createReadonlyFetchOptions(): RequestInit

  export function fetchPrivateUserProfilePayloads(options: {
    credentials: { userId: string; hash: string }
    baseUrl?: string
    fetchImpl?: typeof fetch
  }): Promise<{
    userDetails: unknown
    campaignDetails: unknown
    formationSaves: unknown
  }>

  export function fetchAndStorePrivateUserProfilePayloads(options?: {
    envFile?: string
    baseUrl?: string
    latestDir?: string
    payloadFilename?: string
    env?: Record<string, string | undefined>
    fetchImpl?: typeof fetch
    cwd?: string
  }): Promise<{
    manifest: {
      payloadName: string
      timestamp: string
      outputDir: string
      maskedUserId: string
      maskedHash: string
    }
    payloads: {
      userDetails: unknown
      campaignDetails: unknown
      formationSaves: unknown
    }
    timestampDir: string
    latestDir: string
  }>
}
