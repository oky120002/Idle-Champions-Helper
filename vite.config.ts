import fs from 'node:fs/promises'
import path from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  DEFAULT_PRIVATE_PAYLOAD_FILENAME,
  fetchAndStorePrivateUserProfilePayloads,
} from './scripts/private-user-data/privateUserProfilePayloadHelpers'

const repoName = 'Idle-Champions-Helper'
const localDevPrivateSnapshotEndpoint = '/__dev/private-user-data/user-profile-payloads'
const localDevPrivateSnapshotRefreshEndpoint = '/__dev/private-user-data/refresh'
const defaultLocalDevPrivateSnapshotPath = 'tmp/private-user-data/latest/user-profile-payloads.json'
const browserOnlyUserProfileSourceResolverPath = path.resolve(
  process.cwd(),
  'src/data/user-profile-store/userProfileSourceResolver.prod.ts',
)
const browserOnlyLocalDevSnapshotSectionPath = path.resolve(
  process.cwd(),
  'src/pages/user-data/LocalDevSnapshotSection.prod.tsx',
)
const browserOnlyPlannerProfileSourceLabelPath = path.resolve(
  process.cwd(),
  'src/pages/planner/plannerProfileSourceLabel.prod.ts',
)
const browserOnlyUserHeroProfileSourceLabelPath = path.resolve(
  process.cwd(),
  'src/pages/user-heroes/userHeroProfileSourceLabel.prod.ts',
)
const browserOnlyUserSyncLocalDevActionPath = path.resolve(
  process.cwd(),
  'src/pages/user-data/userSyncLocalDevAction.prod.ts',
)
const browserOnlyUserSyncModelPath = path.resolve(
  process.cwd(),
  'src/pages/user-data/useUserSyncModel.prod.ts',
)

function normalizeChunkId(id: string) {
  return id.replaceAll('\\', '/')
}

function resolveManualChunk(id: string) {
  const normalizedId = normalizeChunkId(id)

  if (
    normalizedId.includes('/node_modules/react-router-dom/')
    || normalizedId.includes('/node_modules/react-router/')
  ) {
    return 'vendor-router'
  }

  if (
    normalizedId.includes('/node_modules/react-dom/')
    || normalizedId.includes('/node_modules/scheduler/')
  ) {
    return 'vendor-react-dom'
  }

  if (normalizedId.endsWith('/src/app/i18n.tsx')) {
    return 'app-i18n'
  }

  if (normalizedId.includes('/src/features/skelanim-player/')) {
    return 'shared-skelanim'
  }

  if (
    normalizedId.endsWith('/src/components/StatusBanner.tsx')
    || normalizedId.endsWith('/src/components/SurfaceCard.tsx')
    || normalizedId.includes('/src/components/workbench/')
  ) {
    return 'shared-page-ui'
  }

  if (
    normalizedId.includes('/src/components/filter-sidebar/')
    || normalizedId.endsWith('/src/components/FieldGroup.tsx')
    || normalizedId.endsWith('/src/components/FilterDisclosureSection.tsx')
    || normalizedId.endsWith('/src/components/PageHeaderMetrics.tsx')
    || normalizedId.includes('/src/features/champion-filters/')
  ) {
    return 'shared-filters'
  }

  if (
    normalizedId.endsWith('/src/components/ChampionAvatar.tsx')
    || normalizedId.endsWith('/src/components/ChampionIdentity.tsx')
    || normalizedId.endsWith('/src/components/LocalizedText.tsx')
    || normalizedId.endsWith('/src/data/client.ts')
    || normalizedId.endsWith('/src/domain/localizedText.ts')
  ) {
    return 'shared-champion-core'
  }

  if (
    normalizedId.endsWith('/src/domain/championPlacement.ts')
    || normalizedId.endsWith('/src/domain/formationLayout.ts')
  ) {
    return 'shared-formation-model'
  }

  return undefined
}

function createLocalDevPrivateSnapshotPlugin(): Plugin {
  const snapshotPath = path.resolve(
    process.cwd(),
    process.env.IC_PRIVATE_SNAPSHOT_PATH ?? defaultLocalDevPrivateSnapshotPath,
  )
  const snapshotDir = path.dirname(snapshotPath)
  const snapshotFilename = path.basename(snapshotPath)
  const relativeSnapshotDir = path.relative(process.cwd(), snapshotDir)

  return {
    name: 'local-dev-private-snapshot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url === localDevPrivateSnapshotRefreshEndpoint && request.method === 'POST') {
          response.setHeader('Content-Type', 'application/json; charset=utf-8')

          try {
            const result = await fetchAndStorePrivateUserProfilePayloads({
              latestDir: relativeSnapshotDir,
              payloadFilename: snapshotFilename || DEFAULT_PRIVATE_PAYLOAD_FILENAME,
            })
            response.statusCode = 200
            response.end(JSON.stringify({
              manifest: result.manifest,
            }))
          } catch (error) {
            response.statusCode = 500
            response.end(JSON.stringify({
              error: error instanceof Error
                ? `Failed to refresh local private snapshot: ${error.message}`
                : 'Failed to refresh local private snapshot.',
            }))
          }
          return
        }

        if (request.url !== localDevPrivateSnapshotEndpoint || request.method !== 'GET') {
          next()
          return
        }

        try {
          const payload = await fs.readFile(snapshotPath, 'utf8')
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(payload)
        } catch (error) {
          response.setHeader('Content-Type', 'application/json; charset=utf-8')

          if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            response.statusCode = 404
            response.end(JSON.stringify({
              error: 'Local private snapshot not found. Run `npm run private-user-data:fetch` first.',
            }))
            return
          }

          response.statusCode = 500
          response.end(JSON.stringify({
            error: 'Failed to read local private snapshot for Vite dev mode.',
          }))
        }
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), createLocalDevPrivateSnapshotPlugin()],
  resolve: {
    alias: command === 'build'
      ? [
          {
            find: './userProfileSourceResolver',
            replacement: browserOnlyUserProfileSourceResolverPath,
          },
          {
            find: './LocalDevSnapshotSection',
            replacement: browserOnlyLocalDevSnapshotSectionPath,
          },
          {
            find: './plannerProfileSourceLabel',
            replacement: browserOnlyPlannerProfileSourceLabelPath,
          },
          {
            find: './userHeroProfileSourceLabel',
            replacement: browserOnlyUserHeroProfileSourceLabelPath,
          },
          {
            find: './userSyncLocalDevAction',
            replacement: browserOnlyUserSyncLocalDevActionPath,
          },
          {
            find: './useUserSyncModel',
            replacement: browserOnlyUserSyncModelPath,
          },
          {
            find: '../user-data/useUserSyncModel',
            replacement: browserOnlyUserSyncModelPath,
          },
        ]
      : [],
  },
  base: command === 'serve' ? '/' : `/${repoName}/`,
  build: {
    rollupOptions: {
      output: {
        // Keep runtime and shared UI/data bundles stable so AI-driven page work hits fewer, clearer files.
        manualChunks: resolveManualChunk,
      },
    },
  },
}))
