import { useEffect, useState } from 'react'
import { loadVersion } from '../data/client'
import type { DataVersion } from '../domain/types'
import { HomeHeroPanel } from './home/HomeHeroPanel'
import { HomeRoadmapCards } from './home/HomeRoadmapCards'

export function HomePage() {
  const [versionState, setVersionState] = useState<{
    status: 'loading' | 'ready' | 'error'
    data: DataVersion | null
    errorMessage: string | null
  }>({
    status: 'loading',
    data: null,
    errorMessage: null,
  })

  useEffect(() => {
    let disposed = false

    loadVersion()
      .then((data) => {
        if (disposed) {
          return
        }

        setVersionState({
          status: 'ready',
          data,
          errorMessage: null,
        })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        setVersionState({
          status: 'error',
          data: null,
          errorMessage: error instanceof Error ? error.message : null,
        })
      })

    return () => {
      disposed = true
    }
  }, [])

  return (
    <div className="page-stack">
      <HomeHeroPanel versionState={versionState} />
      <HomeRoadmapCards />
    </div>
  )
}
