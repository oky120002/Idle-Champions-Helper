import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'Idle-Champions-Helper'

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

export default defineConfig(({ command }) => ({
  plugins: [react()],
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
