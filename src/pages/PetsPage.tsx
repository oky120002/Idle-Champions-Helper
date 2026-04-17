import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../app/i18n'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import type { Pet } from '../domain/types'
import { PetFilters } from './pets/PetFilters'
import { PetResultsGrid } from './pets/PetResultsGrid'
import { PetSummaryFooter } from './pets/PetSummaryFooter'
import { matchesPetQuery } from './pets/search'
import type { AssetFilter, SourceFilter } from './pets/types'

type PetState =
  | { status: 'loading' }
  | { status: 'ready'; pets: Pet[] }
  | { status: 'error'; message: string }

const EMPTY_PETS: Pet[] = []

export function PetsPage() {
  const { t } = useI18n()
  const [state, setState] = useState<PetState>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all')

  useEffect(() => {
    let disposed = false

    loadCollection<Pet>('pets')
      .then((collection) => {
        if (disposed) {
          return
        }

        setState({ status: 'ready', pets: collection.items })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '',
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  const pets = state.status === 'ready' ? state.pets : EMPTY_PETS
  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      if (sourceFilter !== 'all' && pet.acquisition.kind !== sourceFilter) {
        return false
      }

      const hasCompleteArt = Boolean(pet.icon && pet.illustration)

      if (assetFilter === 'complete' && !hasCompleteArt) {
        return false
      }

      if (assetFilter === 'missing' && hasCompleteArt) {
        return false
      }

      return matchesPetQuery(pet, query)
    })
  }, [assetFilter, pets, query, sourceFilter])

  const summary = useMemo(
    () => ({
      total: pets.length,
      gems: pets.filter((pet) => pet.acquisition.kind === 'gems').length,
      premium: pets.filter((pet) => pet.acquisition.kind === 'premium').length,
      patron: pets.filter((pet) => pet.acquisition.kind === 'patron').length,
      unavailable: pets.filter((pet) => pet.acquisition.kind === 'not-yet-available').length,
      completeArt: pets.filter((pet) => pet.icon && pet.illustration).length,
    }),
    [pets],
  )

  return (
    <div className="page-shell pets-page">
      <SurfaceCard
        eyebrow={t({ zh: '官方 familiar definitions', en: 'Official familiar definitions' })}
        title={t({ zh: '宠物图鉴', en: 'Pet catalog' })}
        description={t({
          zh: '本页基于官方 `familiar_defines`、`premium_item_defines` 与 `patron_shop_item_defines` 归一化生成，并在构建期把宠物图标与 4x 立绘同步为站内静态资源。',
          en: 'This page is normalized from official familiar, premium item, and patron shop definitions, then syncs pet icons and 4x illustrations into local static assets at build time.',
        })}
        footer={<PetSummaryFooter summary={summary} />}
      >
        <PetFilters
          query={query}
          sourceFilter={sourceFilter}
          assetFilter={assetFilter}
          onQueryChange={setQuery}
          onSourceFilterChange={setSourceFilter}
          onAssetFilterChange={setAssetFilter}
        />

        {state.status === 'loading' ? (
          <StatusBanner
            tone="info"
            title={t({ zh: '正在加载宠物目录', en: 'Loading pet catalog' })}
            detail={t({
              zh: '正在读取本地版本化的宠物清单与静态图像。',
              en: 'Reading the local versioned pet manifest and static images.',
            })}
          />
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '宠物目录加载失败', en: 'Failed to load pet catalog' })}
            detail={
              state.message
                ? t({
                    zh: `无法读取 pets 数据：${state.message}`,
                    en: `Unable to read pets data: ${state.message}`,
                  })
                : t({
                    zh: '无法读取 pets 数据。',
                    en: 'Unable to read pets data.',
                  })
            }
          />
        ) : null}

        {state.status === 'ready' ? <PetResultsGrid pets={filteredPets} /> : null}
      </SurfaceCard>
    </div>
  )
}
