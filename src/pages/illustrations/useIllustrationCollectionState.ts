import { useEffect, useState } from 'react'
import { loadCollection } from '../../data/client'
import type { Champion, ChampionIllustration, DataCollection } from '../../domain/types'
import { isLocalizedEnumGroup, isStringEnumGroup } from '../../features/champion-filters/enumGroups'
import type { IllustrationState } from './types'

const EMPTY_CHAMPION_COLLECTION: DataCollection<Champion> = {
  updatedAt: '',
  items: [],
}

const EMPTY_UNKNOWN_COLLECTION: DataCollection<unknown> = {
  updatedAt: '',
  items: [],
}

export function useIllustrationCollectionState(): IllustrationState {
  const [state, setState] = useState<IllustrationState>({ status: 'loading' })

  useEffect(() => {
    let disposed = false

    Promise.all([
      loadCollection<ChampionIllustration>('champion-illustrations'),
      loadCollection<Champion>('champions').catch(() => EMPTY_CHAMPION_COLLECTION),
      loadCollection<unknown>('enums').catch(() => EMPTY_UNKNOWN_COLLECTION),
    ])
      .then(([illustrationCollection, championCollection, enumCollection]) => {
        if (disposed) {
          return
        }

        const stringGroups = enumCollection.items.filter(isStringEnumGroup)
        const localizedGroups = enumCollection.items.filter(isLocalizedEnumGroup)
        const roles = stringGroups.find((group) => group.id === 'roles')?.values ?? []
        const affiliations = localizedGroups.find((group) => group.id === 'affiliations')?.values ?? []

        setState({
          status: 'ready',
          illustrations: illustrationCollection.items,
          champions: championCollection.items,
          roles,
          affiliations,
        })
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

  return state
}
