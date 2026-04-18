import { useEffect, useState } from 'react'
import type { DataVersion } from '../domain/types'
import { loadVersion } from './client'

export type DataVersionState =
  | {
      status: 'loading'
      data: null
    }
  | {
      status: 'ready'
      data: DataVersion
    }
  | {
      status: 'error'
      data: null
    }

export function useDataVersionState(): DataVersionState {
  const [state, setState] = useState<DataVersionState>({ status: 'loading', data: null })

  useEffect(() => {
    let disposed = false

    loadVersion()
      .then((data) => {
        if (disposed) {
          return
        }

        setState({ status: 'ready', data })
      })
      .catch(() => {
        if (disposed) {
          return
        }

        setState({ status: 'error', data: null })
      })

    return () => {
      disposed = true
    }
  }, [])

  return state
}
