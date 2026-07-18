// Keep Vite config on typed TS imports while reusing the plain ESM helper shared by node scripts.
// @ts-expect-error local node-only helper intentionally stays in .mjs so CLI scripts can run it directly
import * as helper from './private-user-profile-payloads.mjs'

export const DEFAULT_PRIVATE_PAYLOAD_FILENAME = (
  helper as {
    DEFAULT_PRIVATE_PAYLOAD_FILENAME: string
  }
).DEFAULT_PRIVATE_PAYLOAD_FILENAME

export const fetchAndStorePrivateUserProfilePayloads = (
  helper as {
    fetchAndStorePrivateUserProfilePayloads: (options?: {
      envFile?: string
      baseUrl?: string
      latestDir?: string
      payloadFilename?: string
      env?: Record<string, string | undefined>
      fetchImpl?: typeof fetch
      cwd?: string
    }) => Promise<{
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
).fetchAndStorePrivateUserProfilePayloads
