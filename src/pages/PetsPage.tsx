import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../app/i18n'
import { FilterSidebarLayout } from '../components/filter-sidebar/FilterSidebarLayout'
import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { loadCollection } from '../data/client'
import type { Pet } from '../domain/types'
import { MAX_VISIBLE_PETS } from './pets/constants'
import { PetFilters } from './pets/PetFilters'
import { PetsMetrics } from './pets/PetsMetrics'
import { PetsResultsSection } from './pets/PetsResultsSection'
import { shufflePets } from './pets/pet-results-order'
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
  const [showAllResults, setShowAllResults] = useState(false)
  const [randomOrderSeed, setRandomOrderSeed] = useState<number | null>(null)

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
    const nextPets = pets.filter((pet) => {
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

    return randomOrderSeed === null ? nextPets : shufflePets(nextPets, randomOrderSeed)
  }, [assetFilter, pets, query, randomOrderSeed, sourceFilter])
  const visiblePets = useMemo(
    () => (showAllResults ? filteredPets : filteredPets.slice(0, MAX_VISIBLE_PETS)),
    [filteredPets, showAllResults],
  )
  const canToggleResultVisibility = filteredPets.length > MAX_VISIBLE_PETS

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

  function runFilterMutation(mutation: () => void) {
    setShowAllResults(false)
    mutation()
  }

  function clearAllFilters() {
    runFilterMutation(() => {
      setQuery('')
      setSourceFilter('all')
      setAssetFilter('all')
    })
  }

  return (
    <div className="page-shell pets-page">
      <SurfaceCard
        headerContent={
          <PageTabHeader
            eyebrow={t({ zh: '宠物图鉴', en: 'Pet catalog' })}
            accentLabel="PETS"
            title={t({ zh: '按来源与图像状态整理宠物目录', en: 'Organize the pet catalog by source and asset coverage' })}
            aside={state.status === 'ready' ? <PetsMetrics summary={summary} /> : null}
          />
        }
      >
        <FilterSidebarLayout
          sidebar={
            <PetFilters
              query={query}
              sourceFilter={sourceFilter}
              assetFilter={assetFilter}
              onQueryChange={(value) => runFilterMutation(() => setQuery(value))}
              onSourceFilterChange={(value) => runFilterMutation(() => setSourceFilter(value))}
              onAssetFilterChange={(value) => runFilterMutation(() => setAssetFilter(value))}
              onClearAllFilters={clearAllFilters}
            />
          }
        >
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

          {state.status === 'ready' ? (
            <PetsResultsSection
              filteredPets={filteredPets}
              visiblePets={visiblePets}
              totalPets={pets.length}
              showAllResults={showAllResults}
              canToggleResultVisibility={canToggleResultVisibility}
              hasRandomOrder={randomOrderSeed !== null}
              onToggleResultVisibility={() => setShowAllResults((current) => !current)}
              onRandomizeResultOrder={() => setRandomOrderSeed((current) => (current === null ? 1 : current + 1))}
            />
          ) : null}
        </FilterSidebarLayout>
      </SurfaceCard>
    </div>
  )
}
