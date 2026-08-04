import type {
  AnimationAuditEntry,
  AnimationAuditFeedbackById,
  AnimationAuditFeedbackDraft,
  AnimationAuditFeedbackExportEntry,
  AnimationAuditFeedbackExportPayload,
  AnimationAuditFeedbackTag,
} from './types'

const FEEDBACK_STORAGE_KEY = 'animation-audit.feedback.v1'

export const ANIMATION_AUDIT_FEEDBACK_TAGS: AnimationAuditFeedbackTag[] = [
  'joint_dislocation',
  'not_idle_like',
  'motion_too_busy',
  'sparse_or_cropped',
  'samey_template',
]

export function createEmptyAnimationAuditFeedbackDraft(): AnimationAuditFeedbackDraft {
  return {
    verdict: null,
    tags: [],
    note: '',
  }
}

function dedupeFeedbackTags(tags: AnimationAuditFeedbackTag[]) {
  return ANIMATION_AUDIT_FEEDBACK_TAGS.filter((tag) => tags.includes(tag))
}

function coerceFeedbackTags(tags: unknown[]) {
  return dedupeFeedbackTags(
    tags.filter((tag): tag is AnimationAuditFeedbackTag => ANIMATION_AUDIT_FEEDBACK_TAGS.includes(tag as AnimationAuditFeedbackTag)),
  )
}

export function normalizeAnimationAuditFeedbackDraft(
  draft: AnimationAuditFeedbackDraft,
): AnimationAuditFeedbackDraft | null {
  const note = draft.note.trim()
  const tags = dedupeFeedbackTags(draft.tags)

  if (!draft.verdict && tags.length === 0 && !note) {
    return null
  }

  return {
    verdict: draft.verdict,
    tags,
    note,
  }
}

export function isMeaningfulAnimationAuditFeedback(
  draft: AnimationAuditFeedbackDraft | undefined,
): draft is AnimationAuditFeedbackDraft {
  return draft ? normalizeAnimationAuditFeedbackDraft(draft) !== null : false
}

export function toggleAnimationAuditFeedbackTag(
  draft: AnimationAuditFeedbackDraft,
  tag: AnimationAuditFeedbackTag,
): AnimationAuditFeedbackDraft {
  const nextTags = draft.tags.includes(tag)
    ? draft.tags.filter((item) => item !== tag)
    : [...draft.tags, tag]

  return {
    ...draft,
    tags: dedupeFeedbackTags(nextTags),
  }
}

export function readStoredAnimationAuditFeedback(): AnimationAuditFeedbackById {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(FEEDBACK_STORAGE_KEY)

    if (!rawValue) {
      return {}
    }

    const parsed: unknown = JSON.parse(rawValue)

    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    const parsedRecord = parsed as Record<string, unknown>

    return Object.fromEntries(
      Object.entries(parsedRecord).flatMap(([entryId, value]) => {
        if (!value || typeof value !== 'object') {
          return []
        }

        const candidate = value as Partial<AnimationAuditFeedbackDraft>
        const normalized = normalizeAnimationAuditFeedbackDraft({
          verdict: candidate.verdict ?? null,
          tags: Array.isArray(candidate.tags) ? coerceFeedbackTags(candidate.tags) : [],
          note: typeof candidate.note === 'string' ? candidate.note : '',
        })

        return normalized ? [[entryId, normalized]] : []
      }),
    )
  } catch {
    return {}
  }
}

export function writeStoredAnimationAuditFeedback(feedbackById: AnimationAuditFeedbackById) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackById))
}

function buildFeedbackExportEntry(
  entry: AnimationAuditEntry,
  feedback: AnimationAuditFeedbackDraft,
): AnimationAuditFeedbackExportEntry {
  const alternate = entry.candidates.find(
    (candidate) => candidate.sequenceIndex !== entry.recommended.sequenceIndex,
  )

  return {
    id: entry.id,
    championId: entry.championId,
    skinId: entry.skinId,
    kind: entry.kind,
    seat: entry.seat,
    championName: entry.championName.display,
    illustrationName: entry.illustrationName.display,
    suspicionLevel: entry.suspicionLevel,
    suspicionScore: entry.suspicionScore,
    suspicionSignals: entry.suspicionSignals,
    verdict: feedback.verdict,
    preferredSequenceIndex:
      feedback.verdict === 'current'
        ? entry.current.sequenceIndex
        : feedback.verdict === 'recommended'
          ? entry.recommended.sequenceIndex
          : feedback.verdict === 'alternate'
            ? (alternate?.sequenceIndex ?? null)
            : null,
    tags: feedback.tags,
    note: feedback.note,
    currentSequenceIndex: entry.current.sequenceIndex,
    recommendedSequenceIndex: entry.recommended.sequenceIndex,
    alternateSequenceIndex: alternate?.sequenceIndex ?? null,
  }
}

export function buildAnimationAuditFeedbackPayload({
  auditEntries,
  feedbackById,
  generatedAt,
  sourceHref,
}: {
  auditEntries: AnimationAuditEntry[]
  feedbackById: AnimationAuditFeedbackById
  generatedAt: string
  sourceHref: string | null
}): AnimationAuditFeedbackExportPayload {
  const feedbackEntries = auditEntries.flatMap((entry) => {
    const feedback = normalizeAnimationAuditFeedbackDraft(
      feedbackById[entry.id] ?? createEmptyAnimationAuditFeedbackDraft(),
    )

    return feedback ? [buildFeedbackExportEntry(entry, feedback)] : []
  })

  return {
    version: 1,
    generatedAt,
    sourceHref,
    totalSelected: feedbackEntries.length,
    entries: feedbackEntries,
  }
}
