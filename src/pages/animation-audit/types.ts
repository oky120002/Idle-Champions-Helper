import type { ChampionAnimation, ChampionAnimationKind, ChampionIllustrationRenderBounds, LocalizedText } from '../../domain/types'

export type AnimationAuditSuspicionLevel = 'high' | 'medium' | 'low' | 'none'

export interface AnimationAuditSequenceMetrics {
  sequenceIndex: number
  frameIndex: number
  frameCount: number
  pieceCount: number
  renderableFrameCount: number
  renderableFrameRatio: number
  persistentPieceCount: number
  persistentPieceRatio: number
  singleFramePieceCount: number
  singleFramePieceRatio: number
  averageVisiblePieceRatio: number
  nullPieceRatio: number
  bounds: ChampionIllustrationRenderBounds | null
  boundsArea: number
  averageMotion: number
  pieceCoverageRatio: number
  boundsAreaRatio: number
  motionRatio: number
  motionScore: number
  score: number
}

export interface AnimationAuditEntry {
  id: string
  championId: string
  skinId: string | null
  kind: ChampionAnimationKind
  seat: number
  championName: LocalizedText
  illustrationName: LocalizedText
  currentSequenceIndex: number
  currentFrameIndex: number
  sequenceCount: number
  suspicionLevel: AnimationAuditSuspicionLevel
  suspicionScore: number
  suspicionSignals: string[]
  current: AnimationAuditSequenceMetrics
  recommended: AnimationAuditSequenceMetrics
  candidates: AnimationAuditSequenceMetrics[]
}

export type AnimationAuditState =
  | { status: 'loading' }
  | {
      status: 'ready'
      auditEntries: AnimationAuditEntry[]
      animationsById: ReadonlyMap<string, ChampionAnimation>
      fallbackImageById: ReadonlyMap<string, string>
    }
  | { status: 'error'; message: string }

export type AnimationAuditLevelFilter = 'flagged' | AnimationAuditSuspicionLevel | 'all'
export type AnimationAuditKindFilter = 'all' | ChampionAnimationKind

export interface AnimationAuditVariant {
  key: string
  label: string
  badge?: string
  animation: ChampionAnimation
  metrics: AnimationAuditSequenceMetrics
}

export type AnimationAuditFeedbackVerdict = 'current' | 'recommended' | 'alternate' | 'manual'

export type AnimationAuditFeedbackTag =
  | 'joint_dislocation'
  | 'not_idle_like'
  | 'motion_too_busy'
  | 'sparse_or_cropped'
  | 'samey_template'

export interface AnimationAuditFeedbackDraft {
  verdict: AnimationAuditFeedbackVerdict | null
  tags: AnimationAuditFeedbackTag[]
  note: string
}

export type AnimationAuditFeedbackById = Record<string, AnimationAuditFeedbackDraft>

export type AnimationAuditCopyState = 'idle' | 'success' | 'error'

export interface AnimationAuditFeedbackExportEntry {
  id: string
  championId: string
  skinId: string | null
  kind: ChampionAnimationKind
  seat: number
  championName: string
  illustrationName: string
  suspicionLevel: AnimationAuditSuspicionLevel
  suspicionScore: number
  suspicionSignals: string[]
  verdict: AnimationAuditFeedbackVerdict | null
  preferredSequenceIndex: number | null
  tags: AnimationAuditFeedbackTag[]
  note: string
  currentSequenceIndex: number
  recommendedSequenceIndex: number
  alternateSequenceIndex: number | null
}

export interface AnimationAuditFeedbackExportPayload {
  version: 1
  generatedAt: string
  sourceHref: string | null
  totalSelected: number
  entries: AnimationAuditFeedbackExportEntry[]
}
