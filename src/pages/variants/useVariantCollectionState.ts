import { useEffect, useState } from 'react'
import { loadCollection } from '../../data/client'
import type { FormationLayout, LocalizedOption, Variant } from '../../domain/types'
import { isCampaignEnumGroup, isLocalizedOption } from './variant-model'
import type { VariantState } from './types'

export function useVariantCollectionState(): VariantState {
  const [state, setState] = useState<VariantState>({ status: 'loading' })

  useEffect(() => {
    let disposed = false

    Promise.all([
      loadCollection<Variant>('variants'),
      loadCollection<unknown>('enums'),
      loadCollection<FormationLayout>('formations'),
    ])
      .then(([variantCollection, enumCollection, formationCollection]) => {
        if (disposed) {
          return
        }

        const campaigns =
          enumCollection.items.find(isCampaignEnumGroup)?.values.filter(
            (item): item is LocalizedOption => isLocalizedOption(item),
          ) ?? []

        setState({
          status: 'ready',
          variants: variantCollection.items,
          campaigns,
          formations: formationCollection.items,
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
