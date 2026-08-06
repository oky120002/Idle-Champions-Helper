import { useEffect, useState } from 'react'
import { loadCollection } from '../../data/client'
import type { Champion, ChampionIllustration, ChampionVisual } from '../../domain/types'
import type {
  IdLocalizedEnumGroup,
  LocalizedEnumGroup,
  StringEnumGroup,
} from '../../features/champion-filters/types'
import {
  isIdLocalizedEnumGroup,
  isLocalizedEnumGroup,
  isStringEnumGroup,
} from '../../features/champion-filters/enumGroups'
import type { ChampionState } from './types'

export function useChampionCollectionState() {
  const [state, setState] = useState<ChampionState>({ status: 'loading' })

  useEffect(() => {
    let disposed = false

    Promise.all([
      loadCollection<Champion>('champions'),
      loadCollection<StringEnumGroup | LocalizedEnumGroup | IdLocalizedEnumGroup>('enums'),
      loadCollection<ChampionVisual>('champion-visuals').catch(() => ({
        updatedAt: '',
        items: [],
      })),
      loadCollection<ChampionIllustration>('champion-illustrations').catch(() => ({
        updatedAt: '',
        items: [],
      })),
    ])
      .then(([championCollection, enumCollection, visualCollection, illustrationCollection]) => {
        if (disposed) {
          return
        }

        const stringGroups = enumCollection.items.filter(isStringEnumGroup)
        const localizedGroups = enumCollection.items.filter(isLocalizedEnumGroup)
        const idLocalizedGroups = enumCollection.items.filter(isIdLocalizedEnumGroup)
        const roles = stringGroups.find((group) => group.id === 'roles')?.values ?? []
        const affiliations = localizedGroups.find((group) => group.id === 'affiliations')?.values ?? []
        const patrons = idLocalizedGroups.find((group) => group.id === 'patrons')?.values ?? []

        setState({
          status: 'ready',
          champions: championCollection.items,
          visuals: visualCollection.items,
          heroIllustrations: illustrationCollection.items.filter((illustration) => illustration.kind === 'hero-base'),
          roles,
          affiliations,
          patrons,
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
