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
  AnimationAuditFeedbackById,
  AnimationAuditFeedbackDraft,
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
  if (filter === 'all') return true
  if (filter === 'flagged') return entry.suspicionLevel !== 'none'
  return entry.suspicionLevel === filter
}

function matchesKind(entry: AnimationAuditEntry, filter: AnimationAuditKindFilter) {
  return filter === 'all' ? true : entry.kind === filter
}

function matchesSearch(entry: AnimationAuditEntry, search: string) {
  const normalizedSearch = search.trim().toLowerCase()
  if (normalizedSearch === '') return true
  return [
    entry.id, entry.championId, entry.skinId ?? '',
    entry.championName.original, entry.championName.display,
    entry.illustrationName.original, entry.illustrationName.display,
  ].some((value) => value.toLowerCase().includes(normalizedSearch))
}

function removeFeedbackEntry(current: AnimationAuditFeedbackById, entryId: string): AnimationAuditFeedbackById {
  return Object.fromEntries(Object.entries(current).filter(([key]) => key !== entryId))
}

function applyFeedbackUpdate(
  current: AnimationAuditFeedbackById,
  entryId: string,
  updater: (draft: AnimationAuditFeedbackDraft) => AnimationAuditFeedbackDraft,
): AnimationAuditFeedbackById {
  const nextDraft = updater(current[entryId] ?? createEmptyAnimationAuditFeedbackDraft())
  const note = nextDraft.note.trim()
  const hasMeaningfulValue = Boolean(nextDraft.verdict) || nextDraft.tags.length > 0 || note.length > 0
  if (!hasMeaningfulValue) return removeFeedbackEntry(current, entryId)
  return { ...current, [entryId]: { verdict: nextDraft.verdict, tags: nextDraft.tags, note } }
}

function computeAuditSummary(auditEntries: AnimationAuditEntry[]) {
  return {
    total: auditEntries.length,
    flagged: auditEntries.filter((entry) => entry.suspicionLevel !== 'none').length,
    high: auditEntries.filter((entry) => entry.suspicionLevel === 'high').length,
    medium: auditEntries.filter((entry) => entry.suspicionLevel === 'medium').length,
    low: auditEntries.filter((entry) => entry.suspicionLevel === 'low').length,
    heroBase: auditEntries.filter((entry) => entry.kind === 'hero-base').length,
    skin: auditEntries.filter((entry) => entry.kind === 'skin').length,
  }
}

function computeFeedbackSummary(feedbackById: AnimationAuditFeedbackById) {
  const entries = Object.values(feedbackById)
  return {
    selected: entries.filter(isMeaningfulAnimationAuditFeedback).length,
    withVerdict: entries.filter((draft) => draft.verdict !== null).length,
    withTags: entries.filter((draft) => draft.tags.length > 0).length,
    withNotes: entries.filter((draft) => draft.note.length > 0).length,
  }
}

function useAnimationAuditData() {
  const [state, setState] = useState<AnimationAuditState>({ status: 'loading' })

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

  return state
}

function useAnimationAuditFeedback() {
  const [feedbackById, setFeedbackById] = useState(() => readStoredAnimationAuditFeedback())

  useEffect(() => {
    writeStoredAnimationAuditFeedback(feedbackById)
  }, [feedbackById])

  const setEntryFeedback = useCallback(
    (entryId: string, updater: (draft: AnimationAuditFeedbackDraft) => AnimationAuditFeedbackDraft) => {
      setFeedbackById((current) => applyFeedbackUpdate(current, entryId, updater))
    },
    [],
  )

  const setFeedbackVerdict = useCallback(
    (entryId: string, verdict: AnimationAuditFeedbackVerdict | null) => {
      setEntryFeedback(entryId, (draft) => ({ ...draft, verdict }))
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
      setEntryFeedback(entryId, (draft) => ({ ...draft, note }))
    },
    [setEntryFeedback],
  )

  const clearFeedback = useCallback((entryId: string) => {
    setFeedbackById((current) => removeFeedbackEntry(current, entryId))
  }, [])

  const clearAllFeedback = useCallback(() => { setFeedbackById({}) }, [])

  const feedbackSummary = useMemo(() => computeFeedbackSummary(feedbackById), [feedbackById])

  return {
    feedbackById,
    setFeedbackVerdict,
    toggleFeedbackTagById,
    setFeedbackNote,
    clearFeedback,
    clearAllFeedback,
    feedbackSummary,
  }
}

function useAnimationAuditFeedbackCopy(
  auditEntries: AnimationAuditEntry[],
  feedbackById: AnimationAuditFeedbackById,
) {
  const [feedbackCopyState, setFeedbackCopyState] = useState<AnimationAuditCopyState>('idle')

  useEffect(() => {
    if (feedbackCopyState === 'idle') return undefined
    const timeoutId = window.setTimeout(() => { setFeedbackCopyState('idle') }, COPY_RESET_DELAY_MS)
    return () => { window.clearTimeout(timeoutId) }
  }, [feedbackCopyState])

  const feedbackPreviewJson = useMemo(() => {
    const payload = buildAnimationAuditFeedbackPayload({
      auditEntries, feedbackById, generatedAt: '<copy-time>',
      sourceHref: typeof window === 'undefined' ? null : window.location.href,
    })
    return JSON.stringify(payload, null, 2)
  }, [auditEntries, feedbackById])

  const copyFeedbackJson = useCallback(async () => {
    const payload = buildAnimationAuditFeedbackPayload({
      auditEntries, feedbackById, generatedAt: new Date().toISOString(),
      sourceHref: typeof window === 'undefined' ? null : window.location.href,
    })

    if (payload.entries.length === 0 || typeof navigator === 'undefined') {
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

  return { feedbackCopyState, feedbackPreviewJson, copyFeedbackJson }
}

export function useAnimationAuditPageModel() {
  const state = useAnimationAuditData()
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<AnimationAuditLevelFilter>('flagged')
  const [kindFilter, setKindFilter] = useState<AnimationAuditKindFilter>('all')
  const [showAll, setShowAll] = useState(false)

  const auditEntries = state.status === 'ready' ? state.auditEntries : EMPTY_AUDIT_ENTRIES
  const filteredEntries = useMemo(
    () =>
      auditEntries.filter(
        (entry) =>
          matchesLevel(entry, levelFilter) && matchesKind(entry, kindFilter) && matchesSearch(entry, search),
      ),
    [auditEntries, kindFilter, levelFilter, search],
  )
  const summary = useMemo(() => computeAuditSummary(auditEntries), [auditEntries])

  const feedback = useAnimationAuditFeedback()
  const { feedbackCopyState, feedbackPreviewJson, copyFeedbackJson } =
    useAnimationAuditFeedbackCopy(auditEntries, feedback.feedbackById)

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
    summary,
    feedbackPreviewJson,
    feedbackCopyState,
    copyFeedbackJson,
    visibleEntries: showAll ? filteredEntries : filteredEntries.slice(0, MAX_DEFAULT_VISIBLE_ENTRIES),
    canShowMore: filteredEntries.length > MAX_DEFAULT_VISIBLE_ENTRIES,
    feedbackById: feedback.feedbackById,
    setFeedbackVerdict: feedback.setFeedbackVerdict,
    toggleFeedbackTagById: feedback.toggleFeedbackTagById,
    setFeedbackNote: feedback.setFeedbackNote,
    clearFeedback: feedback.clearFeedback,
    clearAllFeedback: feedback.clearAllFeedback,
    feedbackSummary: feedback.feedbackSummary,
    hasFeedback: feedback.feedbackSummary.selected > 0,
  }
}
