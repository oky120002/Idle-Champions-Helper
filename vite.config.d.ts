declare module './scripts/private-user-data/private-user-profile-payloads.mjs' {
  export const DEFAULT_PRIVATE_PAYLOAD_FILENAME: string

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
