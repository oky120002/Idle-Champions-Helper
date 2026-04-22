import { useEffect, useRef, useState } from 'react'
import { loadCollection } from '../../data/client'
import type { Pet, PetAnimation } from '../../domain/types'
import type { PetState } from './types'

export function usePetsCollectionState(): PetState {
  const [state, setState] = useState<PetState>({ status: 'loading' })
  const animationCacheRef = useRef<PetAnimation[] | null>(null)

  useEffect(() => {
    let disposed = false

    loadCollection<Pet>('pets')
      .then((collection) => {
        if (disposed) {
          return
        }

        setState({
          status: 'ready',
          pets: collection.items,
          animations: animationCacheRef.current ?? [],
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

  useEffect(() => {
    let disposed = false

    loadCollection<PetAnimation>('pet-animations')
      .then((collection) => {
        if (disposed) {
          return
        }

        animationCacheRef.current = collection.items
        setState((current) => {
          if (current.status !== 'ready') {
            return current
          }

          return {
            ...current,
            animations: collection.items,
          }
        })
      })
      .catch(() => {
        if (disposed) {
          return
        }

        animationCacheRef.current = []
        setState((current) => {
          if (current.status !== 'ready') {
            return current
          }

          return {
            ...current,
            animations: [],
          }
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  return state
}
