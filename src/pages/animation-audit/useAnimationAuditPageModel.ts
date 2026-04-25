import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadCollection, resolveDataUrl } from '../../data/client'
import type { ChampionAnimation, ChampionIllustration } from '../../domain/types'
import {
  buildAnimationAuditFeedbackPayload,
  createEmptyAnimationAuditFeedbackDraft,
  isMeaningfulAnimationAuditFeedback,
  readStoredAnimationAuditFeedback,
  toggleAnimationAuditFeedbackTag,
  writeStoredAnimationAuditFeedback,
} from './feedback'
import type {
  AnimationAuditCopyState,
  AnimationAuditEntry,
  AnimationAuditFeedbackTag,
  AnimationAuditFeedbackVerdict,
  AnimationAuditKindFilter,
  AnimationAuditLevelFilter,
  AnimationAuditState,
} from './types'

const MAX_DEFAULT_VISIBLE_ENTRIES = 24
const EMPTY_AUDIT_ENTRIES: AnimationAuditEntry[] = []
const COPY_RESET_DELAY_MS = 2200

function matchesLevel(entry: AnimationAuditEntry, filter: AnimationAuditLevelFilter) {
  if (filter === 'all') {
    return true
  }

  if (filter === 'flagged') {
    return entry.suspicionLevel !== 'none'
  }

  return entry.suspicionLevel === filter
}

function matchesKind(entry: AnimationAuditEntry, filter: AnimationAuditKindFilter) {
  return filter === 'all' ? true : entry.kind === filter
}

function matchesSearch(entry: AnimationAuditEntry, search: string) {
  if (!search) {
    return true
  }

  const normalizedSearch = search.trim().toLowerCase()

  if (!normalizedSearch) {
    return true
  }

  return [
    entry.id,
    entry.championId,
    entry.skinId ?? '',
    entry.championName.original,
    entry.championName.display,
    entry.illustrationName.original,
    entry.illustrationName.display,
  ].some((value) => value.toLowerCase().includes(normalizedSearch))
}

export function useAnimationAuditPageModel() {
  const [state, setState] = useState<AnimationAuditState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<AnimationAuditLevelFilter>('flagged')
  const [kindFilter, setKindFilter] = useState<AnimationAuditKindFilter>('all')
  const [showAll, setShowAll] = useState(false)
  const [feedbackById, setFeedbackById] = useState(() => readStoredAnimationAuditFeedback())
  const [feedbackCopyState, setFeedbackCopyState] = useState<AnimationAuditCopyState>('idle')

  useEffect(() => {
    let disposed = false

    Promise.all([
      loadCollection<AnimationAuditEntry>('champion-animation-audit'),
      loadCollection<ChampionAnimation>('champion-animations'),
      loadCollection<ChampionIllustration>('champion-illustrations').catch(() => ({ items: [], updatedAt: '' })),
    ])
      .then(([auditCollection, animationCollection, illustrationCollection]) => {
        if (disposed) {
          return
        }

        setState({
          status: 'ready',
          auditEntries: auditCollection.items,
          animationsById: new Map(animationCollection.items.map((item) => [item.id, item])),
          fallbackImageById: new Map(
            illustrationCollection.items.map((item) => [item.id, resolveDataUrl(item.image.path)]),
          ),
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
    writeStoredAnimationAuditFeedback(feedbackById)
  }, [feedbackById])

  useEffect(() => {
    if (feedbackCopyState === 'idle') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackCopyState('idle')
    }, COPY_RESET_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [feedbackCopyState])

  const auditEntries = state.status === 'ready' ? state.auditEntries : EMPTY_AUDIT_ENTRIES
  const filteredEntries = useMemo(
    () =>
      auditEntries.filter(
        (entry) =>
          matchesLevel(entry, levelFilter) && matchesKind(entry, kindFilter) && matchesSearch(entry, search),
      ),
    [auditEntries, kindFilter, levelFilter, search],
  )
  const visibleEntries = showAll ? filteredEntries : filteredEntries.slice(0, MAX_DEFAULT_VISIBLE_ENTRIES)
  const summary = useMemo(
    () => ({
      total: auditEntries.length,
      flagged: auditEntries.filter((entry) => entry.suspicionLevel !== 'none').length,
      high: auditEntries.filter((entry) => entry.suspicionLevel === 'high').length,
      medium: auditEntries.filter((entry) => entry.suspicionLevel === 'medium').length,
      low: auditEntries.filter((entry) => entry.suspicionLevel === 'low').length,
      heroBase: auditEntries.filter((entry) => entry.kind === 'hero-base').length,
      skin: auditEntries.filter((entry) => entry.kind === 'skin').length,
    }),
    [auditEntries],
  )

  const setEntryFeedback = useCallback(
    (
      entryId: string,
      updater: (draft: ReturnType<typeof createEmptyAnimationAuditFeedbackDraft>) => ReturnType<typeof createEmptyAnimationAuditFeedbackDraft>,
    ) => {
      setFeedbackById((current) => {
        const nextDraft = updater(current[entryId] ?? createEmptyAnimationAuditFeedbackDraft())
        const note = nextDraft.note.trim()
        const hasMeaningfulValue = Boolean(nextDraft.verdict) || nextDraft.tags.length > 0 || note.length > 0

        if (!hasMeaningfulValue) {
          const nextFeedbackById = { ...current }
          delete nextFeedbackById[entryId]
          return nextFeedbackById
        }

        return {
          ...current,
          [entryId]: {
            verdict: nextDraft.verdict,
            tags: nextDraft.tags,
            note,
          },
        }
      })
    },
    [],
  )

  const setFeedbackVerdict = useCallback(
    (entryId: string, verdict: AnimationAuditFeedbackVerdict | null) => {
      setEntryFeedback(entryId, (draft) => ({
        ...draft,
        verdict,
      }))
    },
    [setEntryFeedback],
  )

  const toggleFeedbackTagById = useCallback(
    (entryId: string, tag: AnimationAuditFeedbackTag) => {
      setEntryFeedback(entryId, (draft) => toggleAnimationAuditFeedbackTag(draft, tag))
    },
    [setEntryFeedback],
  )

  const setFeedbackNote = useCallback(
    (entryId: string, note: string) => {
      setEntryFeedback(entryId, (draft) => ({
        ...draft,
        note,
      }))
    },
    [setEntryFeedback],
  )

  const clearFeedback = useCallback((entryId: string) => {
    setFeedbackById((current) => {
      const nextFeedbackById = { ...current }
      delete nextFeedbackById[entryId]
      return nextFeedbackById
    })
  }, [])

  const clearAllFeedback = useCallback(() => {
    setFeedbackById({})
  }, [])

  const feedbackSummary = useMemo(
    () => ({
      selected: Object.values(feedbackById).filter((draft) => isMeaningfulAnimationAuditFeedback(draft)).length,
      withVerdict: Object.values(feedbackById).filter((draft) => draft.verdict !== null).length,
      withTags: Object.values(feedbackById).filter((draft) => draft.tags.length > 0).length,
      withNotes: Object.values(feedbackById).filter((draft) => draft.note.length > 0).length,
    }),
    [feedbackById],
  )

  const feedbackPreviewJson = useMemo(() => {
    const payload = buildAnimationAuditFeedbackPayload({
      auditEntries,
      feedbackById,
      generatedAt: '<copy-time>',
      sourceHref: typeof window === 'undefined' ? null : window.location.href,
    })

    return JSON.stringify(payload, null, 2)
  }, [auditEntries, feedbackById])

  const copyFeedbackJson = useCallback(async () => {
    const payload = buildAnimationAuditFeedbackPayload({
      auditEntries,
      feedbackById,
      generatedAt: new Date().toISOString(),
      sourceHref: typeof window === 'undefined' ? null : window.location.href,
    })

    if (
      payload.entries.length === 0 ||
      typeof navigator === 'undefined' ||
      !navigator.clipboard?.writeText
    ) {
      setFeedbackCopyState('error')
      return
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setFeedbackCopyState('success')
    } catch {
      setFeedbackCopyState('error')
    }
  }, [auditEntries, feedbackById])

  return {
    state,
    search,
    setSearch,
    levelFilter,
    setLevelFilter,
    kindFilter,
    setKindFilter,
    showAll,
    setShowAll,
    filteredEntries,
    visibleEntries,
    canShowMore: filteredEntries.length > MAX_DEFAULT_VISIBLE_ENTRIES,
    summary,
    feedbackById,
    setFeedbackVerdict,
    toggleFeedbackTagById,
    setFeedbackNote,
    clearFeedback,
    clearAllFeedback,
    feedbackSummary,
    hasFeedback: feedbackSummary.selected > 0,
    feedbackPreviewJson,
    feedbackCopyState,
    copyFeedbackJson,
  }
}
