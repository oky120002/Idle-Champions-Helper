import { useEffect, useState } from 'react'
import { loadCollection } from '../../data/client'
import type { Champion, ChampionVisual } from '../../domain/types'
import type { LocalizedEnumGroup, StringEnumGroup } from '../../features/champion-filters/types'
import { isLocalizedEnumGroup, isStringEnumGroup } from '../../features/champion-filters/enumGroups'
import type { ChampionState } from './types'

export function useChampionCollectionState() {
  const [state, setState] = useState<ChampionState>({ status: 'loading' })

  useEffect(() => {
    let disposed = false

    Promise.all([
      loadCollection<Champion>('champions'),
      loadCollection<StringEnumGroup | LocalizedEnumGroup>('enums'),
      loadCollection<ChampionVisual>('champion-visuals').catch(() => ({
        updatedAt: '',
        items: [],
      })),
    ])
      .then(([championCollection, enumCollection, visualCollection]) => {
        if (disposed) {
          return
        }

        const stringGroups = enumCollection.items.filter(isStringEnumGroup)
        const localizedGroups = enumCollection.items.filter(isLocalizedEnumGroup)
        const roles = stringGroups.find((group) => group.id === 'roles')?.values ?? []
        const affiliations = localizedGroups.find((group) => group.id === 'affiliations')?.values ?? []

        setState({
          status: 'ready',
          champions: championCollection.items,
          visuals: visualCollection.items,
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
