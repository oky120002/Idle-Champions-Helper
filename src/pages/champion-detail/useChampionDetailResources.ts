import { useEffect, useMemo, useState } from 'react'
import { loadChampionDetail, loadCollection } from '../../data/client'
import type {
  ChampionAnimation,
  ChampionDetail,
  ChampionIllustration,
  ChampionSkinDetail,
  ChampionSpecializationGraphic,
} from '../../domain/types'
import { getSkinArtworkIds, resolveSkinPreviewUrl } from './detail-card-model'
import type { ChampionDetailState } from './types'

function computeIsLoading(state: ChampionDetailState, championId: string | undefined): boolean {
  if (championId === undefined || championId === '') {
    return false
  }
  if (state.status === 'idle') {
    return true
  }
  if (state.status === 'ready') {
    return state.detail.summary.id !== championId
  }
  return state.championId !== championId
}

function manageDialogScrollLock(isOpen: boolean, onClose: () => void): (() => void) | undefined {
  if (!isOpen || typeof window === 'undefined') {
    return
  }

  const previousOverflow = document.body.style.overflow

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeyDown)

  return () => {
    document.body.style.overflow = previousOverflow
    window.removeEventListener('keydown', handleKeyDown)
  }
}

function findSelectedSkin(detail: ChampionDetail | null, selectedSkinId: string | null): ChampionSkinDetail | null {
  if (!detail || detail.skins.length === 0) {
    return null
  }

  return detail.skins.find((skin) => skin.id === selectedSkinId) ?? detail.skins[0] ?? null
}

function resolveNextSkinId(skinId: string | undefined, skins: ChampionSkinDetail[]): string | null {
  if (skinId !== undefined && skinId !== '' && skins.some((skin) => skin.id === skinId)) {
    return skinId
  }
  return skins[0]?.id ?? null
}

function useChampionDetailData(championId: string | undefined) {
  const [state, setState] = useState<ChampionDetailState>({ status: 'idle' })

  useEffect(() => {
    let disposed = false

    if (championId === undefined || championId === '') {
      return
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
          message: error instanceof Error ? error.message : '',
          championId,
        })
      })

    return () => {
      disposed = true
    }
  }, [championId])

  return state
}

function loadIllustrationsIntoMaps(
  setHero: (map: Map<string, ChampionIllustration>) => void,
  setSkin: (map: Map<string, ChampionIllustration>) => void,
): () => void {
  let disposed = false

  loadCollection<ChampionIllustration>('champion-illustrations')
    .then((collection) => {
      if (disposed) {
        return
      }

      setHero(
        new Map(
          collection.items
            .filter((i) => i.kind === 'hero-base')
            .map((i) => [i.championId, i]),
        ),
      )
      setSkin(
        new Map(
          collection.items
            .filter((i) => i.kind === 'skin' && i.skinId != null && i.skinId !== '')
            .map((i) => [i.skinId as string, i]),
        ),
      )
    })
    .catch(() => {
      if (disposed) {
        return
      }

      setHero(new Map())
      setSkin(new Map())
    })

  return () => {
    disposed = true
  }
}

function loadCollectionIntoMap<T>(
  key: string,
  setter: (map: Map<string, T>) => void,
  extract: (items: T[]) => [string, T][],
): () => void {
  let disposed = false

  loadCollection<T>(key)
    .then((collection) => {
      if (disposed) {
        return
      }
      setter(new Map(extract(collection.items)))
    })
    .catch(() => {
      if (disposed) {
        return
      }
      setter(new Map())
    })

  return () => {
    disposed = true
  }
}

function useCollectionMaps() {
  const [skinAnimationsById, setSkinAnimationsById] = useState<Map<string, ChampionAnimation>>(new Map())
  const [heroIllustrationsByChampionId, setHeroIllustrationsByChampionId] = useState<Map<string, ChampionIllustration>>(new Map())
  const [skinIllustrationsById, setSkinIllustrationsById] = useState<Map<string, ChampionIllustration>>(new Map())
  const [specializationGraphicsById, setSpecializationGraphicsById] = useState<
    Map<string, ChampionSpecializationGraphic>
  >(new Map())

  useEffect(
    () =>
      loadCollectionIntoMap<ChampionAnimation>(
        'champion-animations',
        setSkinAnimationsById,
        (items) =>
          items
            .filter((a) => a.kind === 'skin' && a.skinId != null && a.skinId !== '')
            .map((a) => [a.skinId as string, a]),
      ),
    [],
  )

  useEffect(
    () => loadIllustrationsIntoMaps(setHeroIllustrationsByChampionId, setSkinIllustrationsById),
    [],
  )

  useEffect(
    () =>
      loadCollectionIntoMap<ChampionSpecializationGraphic>(
        'champion-specialization-graphics',
        setSpecializationGraphicsById,
        (items) => items.map((item) => [item.graphicId, item]),
      ),
    [],
  )

  return { skinAnimationsById, heroIllustrationsByChampionId, skinIllustrationsById, specializationGraphicsById }
}

export function useChampionDetailResources(championId: string | undefined) {
  const state = useChampionDetailData(championId)
  const {
    skinAnimationsById,
    heroIllustrationsByChampionId,
    skinIllustrationsById,
    specializationGraphicsById,
  } = useCollectionMaps()
  const [artworkDialogChampionId, setArtworkDialogChampionId] = useState<string | null>(null)
  const [selectedSkinId, setSelectedSkinId] = useState<string | null>(null)

  const detail = state.status === 'ready' && state.detail.summary.id === championId ? state.detail : null
  const isMissingChampionId = championId === undefined || championId === ''
  const isArtworkDialogOpen = detail ? artworkDialogChampionId === detail.summary.id : false
  const selectedSkin = useMemo(() => findSelectedSkin(detail, selectedSkinId), [detail, selectedSkinId])
  const isLoading = computeIsLoading(state, championId)
  const selectedSkinArtworkIds = selectedSkin ? getSkinArtworkIds(selectedSkin) : null
  const heroIllustration = detail ? heroIllustrationsByChampionId.get(detail.summary.id) ?? null : null
  const selectedSkinAnimation = selectedSkin ? skinAnimationsById.get(selectedSkin.id) ?? null : null
  const selectedSkinIllustration = selectedSkin ? skinIllustrationsById.get(selectedSkin.id) ?? null : null
  const selectedSkinPreviewUrl = detail && selectedSkin ? resolveSkinPreviewUrl(selectedSkinIllustration) : null

  const openArtworkDialog = (skinId?: string) => {
    if (!detail || detail.skins.length === 0) {
      return
    }

    setSelectedSkinId(resolveNextSkinId(skinId, detail.skins))
    setArtworkDialogChampionId(detail.summary.id)
  }

  const closeArtworkDialog = () => {
    setArtworkDialogChampionId(null)
    setSelectedSkinId(null)
  }

  useEffect(() => manageDialogScrollLock(isArtworkDialogOpen, closeArtworkDialog), [isArtworkDialogOpen])

  return {
    state,
    detail,
    isMissingChampionId,
    isLoading,
    heroIllustration,
    specializationGraphicsById,
    isArtworkDialogOpen,
    selectedSkin,
    selectedSkinAnimation,
    selectedSkinArtworkIds,
    selectedSkinIllustration,
    selectedSkinPreviewUrl,
    openArtworkDialog,
    closeArtworkDialog,
    setSelectedSkinId,
  }
}
