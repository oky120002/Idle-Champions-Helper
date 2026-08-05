// eslint-disable-next-line import-x/no-nodejs-modules -- config 文件合法使用 Node 内建
import fs from 'node:fs/promises'
// eslint-disable-next-line import-x/no-nodejs-modules -- config 文件合法使用 Node 内建
import path from 'node:path'
// eslint-disable-next-line import-x/no-nodejs-modules -- 类型导入，config 文件合法使用 Node 类型
import type { ServerResponse } from 'node:http'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  DEFAULT_PRIVATE_PAYLOAD_FILENAME,
  fetchAndStorePrivateUserProfilePayloads,
} from './scripts/private-user-data/private-user-profile-payloads.ts'

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

type ChunkRule = { chunk: string; matchers: Array<(id: string) => boolean> }

const endsWith =
  (suffix: string) =>
  (id: string): boolean =>
    id.endsWith(suffix)

const includes =
  (sub: string) =>
  (id: string): boolean =>
    id.includes(sub)

const chunkRules: ChunkRule[] = [
  {
    chunk: 'vendor-router',
    matchers: [includes('/node_modules/react-router-dom/'), includes('/node_modules/react-router/')],
  },
  {
    chunk: 'vendor-react-dom',
    matchers: [includes('/node_modules/react-dom/'), includes('/node_modules/scheduler/')],
  },
  { chunk: 'app-i18n', matchers: [endsWith('/src/app/i18n.tsx')] },
  { chunk: 'shared-skelanim', matchers: [includes('/src/features/skelanim-player/')] },
  {
    chunk: 'shared-page-ui',
    matchers: [
      endsWith('/src/components/StatusBanner.tsx'),
      endsWith('/src/components/SurfaceCard.tsx'),
      includes('/src/components/workbench/'),
    ],
  },
  {
    chunk: 'shared-filters',
    matchers: [
      includes('/src/components/filter-sidebar/'),
      endsWith('/src/components/FieldGroup.tsx'),
      endsWith('/src/components/FilterDisclosureSection.tsx'),
      endsWith('/src/components/PageHeaderMetrics.tsx'),
      includes('/src/features/champion-filters/'),
    ],
  },
  { chunk: 'shared-search', matchers: [includes('/src/features/search/')] },
  {
    chunk: 'shared-champion-core',
    matchers: [
      endsWith('/src/components/ChampionAvatar.tsx'),
      endsWith('/src/components/ChampionIdentity.tsx'),
      endsWith('/src/components/LocalizedText.tsx'),
      endsWith('/src/data/client.ts'),
      endsWith('/src/domain/localizedText.ts'),
    ],
  },
  {
    chunk: 'shared-formation-model',
    matchers: [endsWith('/src/domain/championPlacement.ts'), endsWith('/src/domain/formationLayout.ts')],
  },
]

function resolveManualChunk(id: string): string | undefined {
  const normalizedId = normalizeChunkId(id)
  return chunkRules.find(rule => rule.matchers.some(match => match(normalizedId)))?.chunk
}

function isErrnoException(value: unknown): value is { code: string | number } {
  return typeof value === 'object' && value !== null && 'code' in value
}

function respondJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

async function handleSnapshotRefresh(
  response: ServerResponse,
  options: { relativeSnapshotDir: string; snapshotFilename: string },
): Promise<void> {
  try {
    const result = await fetchAndStorePrivateUserProfilePayloads({
      latestDir: options.relativeSnapshotDir,
      payloadFilename: options.snapshotFilename !== '' ? options.snapshotFilename : DEFAULT_PRIVATE_PAYLOAD_FILENAME,
    })
    respondJson(response, 200, { manifest: result.manifest })
  } catch (error) {
    const message = error instanceof Error
      ? `Failed to refresh local private snapshot: ${error.message}`
      : 'Failed to refresh local private snapshot.'
    respondJson(response, 500, { error: message })
  }
}

async function handleSnapshotRead(
  response: ServerResponse,
  snapshotPath: string,
): Promise<void> {
  try {
    const payload = await fs.readFile(snapshotPath, 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(payload)
  } catch (error) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      respondJson(response, 404, {
        error: 'Local private snapshot not found. Run `npm run private-user-data:fetch` first.',
      })
      return
    }
    respondJson(response, 500, { error: 'Failed to read local private snapshot for Vite dev mode.' })
  }
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
      server.middlewares.use((request, response, next) => {
        if (request.url === localDevPrivateSnapshotRefreshEndpoint && request.method === 'POST') {
          void handleSnapshotRefresh(response, { relativeSnapshotDir, snapshotFilename })
          return
        }

        if (request.url !== localDevPrivateSnapshotEndpoint || request.method !== 'GET') {
          next()
          return
        }

        void handleSnapshotRead(response, snapshotPath)
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
