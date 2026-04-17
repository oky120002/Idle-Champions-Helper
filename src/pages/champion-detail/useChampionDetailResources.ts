import { useEffect, useMemo, useState } from 'react'
import { loadChampionDetail, loadCollection } from '../../data/client'
import type {
  ChampionIllustration,
  ChampionSpecializationGraphic,
} from '../../domain/types'
import { getSkinArtworkIds, resolveSkinPreviewUrl } from './detail-card-model'
import type { ChampionDetailState } from './types'

export function useChampionDetailResources(championId: string | undefined) {
  const [state, setState] = useState<ChampionDetailState>({ status: 'idle' })
  const [skinIllustrationsById, setSkinIllustrationsById] = useState<Map<string, ChampionIllustration>>(new Map())
  const [specializationGraphicsById, setSpecializationGraphicsById] = useState<
    Map<string, ChampionSpecializationGraphic>
  >(new Map())
  const [artworkDialogChampionId, setArtworkDialogChampionId] = useState<string | null>(null)
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false

    if (!championId) {
      return undefined
    }

    loadChampionDetail(championId)
      .then((detail) => {
        if (disposed) {
          return
        }

        setState({ status: 'ready', detail })
      })
      .catch((error: unknown) => {
        if (disposed) {
          return
        }

        if (error instanceof Error && error.message === 'HTTP 404') {
          setState({ status: 'not-found', championId })
          return
        }

        setState({
          status: 'error',
          championId,
          message: error instanceof Error ? error.message : '',
        })
      })

    return () => {
      disposed = true
    }
  }, [championId])

  useEffect(() => {
    let disposed = false

    loadCollection<ChampionIllustration>('champion-illustrations')
      .then((collection) => {
        if (disposed) {
          return
        }

        setSkinIllustrationsById(
          new Map(
            collection.items
              .filter((illustration) => illustration.kind === 'skin' && illustration.skinId)
              .map((illustration) => [illustration.skinId as string, illustration]),
          ),
        )
      })
      .catch(() => {
        if (disposed) {
          return
        }

        setSkinIllustrationsById(new Map())
      })

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    let disposed = false

    loadCollection<ChampionSpecializationGraphic>('champion-specialization-graphics')
      .then((collection) => {
        if (disposed) {
          return
        }

        setSpecializationGraphicsById(new Map(collection.items.map((item) => [item.graphicId, item])))
      })
      .catch(() => {
        if (disposed) {
          return
        }

        setSpecializationGraphicsById(new Map())
      })

    return () => {
      disposed = true
    }
  }, [])

  const detail =
    state.status === 'ready' && state.detail.summary.id === championId ? state.detail : null
  const isMissingChampionId = !championId
  const isArtworkDialogOpen = detail ? artworkDialogChampionId === detail.summary.id : false
  const selectedSkin = useMemo(() => {
    if (!detail || detail.skins.length === 0) {
      return null
    }

    return detail.skins.find((skin) => skin.id === selectedSkinId) ?? detail.skins[0] ?? null
  }, [detail, selectedSkinId])
  const isLoading =
    !isMissingChampionId &&
    (state.status === 'idle' ||
      (state.status === 'ready' && state.detail.summary.id !== championId) ||
      (state.status === 'not-found' && state.championId !== championId) ||
      (state.status === 'error' && state.championId !== championId))
  const selectedSkinArtworkIds = selectedSkin ? getSkinArtworkIds(selectedSkin) : null
  const selectedSkinIllustration = selectedSkin ? skinIllustrationsById.get(selectedSkin.id) ?? null : null
  const selectedSkinPreviewUrl =
    detail && selectedSkin
      ? resolveSkinPreviewUrl(selectedSkinIllustration, detail.summary)
      : null

  const openArtworkDialog = (skinId?: string) => {
    if (!detail || detail.skins.length === 0) {
      return
    }

    const nextSkinId = skinId && detail.skins.some((skin) => skin.id === skinId) ? skinId : detail.skins[0]?.id ?? null

    setSelectedSkinId(nextSkinId)
    setArtworkDialogChampionId(detail.summary.id)
  }

  const closeArtworkDialog = () => {
    setArtworkDialogChampionId(null)
    setSelectedSkinId(null)
  }

  useEffect(() => {
    if (!isArtworkDialogOpen || typeof window === 'undefined') {
      return undefined
    }

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeArtworkDialog()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isArtworkDialogOpen])

  return {
    state,
    detail,
    isMissingChampionId,
    isLoading,
    specializationGraphicsById,
    isArtworkDialogOpen,
    selectedSkin,
    selectedSkinArtworkIds,
    selectedSkinIllustration,
    selectedSkinPreviewUrl,
    openArtworkDialog,
    closeArtworkDialog,
    setSelectedSkinId,
  }
}
