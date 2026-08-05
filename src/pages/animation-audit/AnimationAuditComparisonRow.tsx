/* eslint-disable max-lines -- 动画审计对比行：变体网格 + 反馈面板紧耦合，拆分会增加常见修改的打开文件数 */
import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionAnimation } from '../../domain/types'
import { SkelAnimCanvas } from '../../features/skelanim-player/SkelAnimCanvas'
import { AnimationAuditRowFeedback } from './AnimationAuditRowFeedback'
import type {
  AnimationAuditEntry,
  AnimationAuditFeedbackDraft,
  AnimationAuditFeedbackTag,
  AnimationAuditFeedbackVerdict,
  AnimationAuditSequenceMetrics,
  AnimationAuditSuspicionLevel,
  AnimationAuditVariant,
} from './types'

interface AnimationAuditComparisonRowProps {
  readonly entry: AnimationAuditEntry
  readonly animation: ChampionAnimation
  readonly fallbackSrc: string | null
  readonly locale: AppLocale
  readonly t: (text: { zh: string; en: string }) => string
  readonly feedback: AnimationAuditFeedbackDraft
  readonly onVerdictChange: (entryId: string, verdict: AnimationAuditFeedbackVerdict | null) => void
  readonly onTagToggle: (entryId: string, tag: AnimationAuditFeedbackTag) => void
  readonly onNoteChange: (entryId: string, note: string) => void
  readonly onClearFeedback: (entryId: string) => void
}

function formatPercent(value: number) {
  return `${String(Math.round(value * 100))}%`
}

function formatMotion(value: number) {
  return value.toFixed(2)
}

function buildSignalLabel(signal: string, t: AnimationAuditComparisonRowProps['t']) {
  switch (signal) {
    case 'score_gap':
      return t({ zh: '综合评分明显更优', en: 'Score gap' })
    case 'visibility_gap':
      return t({ zh: '可见部件更完整', en: 'Fuller visibility' })
    case 'persistent_gap':
      return t({ zh: '持续可见部件更多', en: 'More persistent pieces' })
    case 'coverage_gap':
      return t({ zh: '轮廓覆盖更完整', en: 'Better coverage' })
    case 'motion_gap':
      return t({ zh: '动作节奏更接近待机', en: 'Idle-like motion' })
    case 'sparse_default':
      return t({ zh: '当前默认序列偏碎', en: 'Sparse default' })
    default:
      return signal
  }
}

function buildSuspicionLevelLabel(
  level: AnimationAuditSuspicionLevel,
  t: AnimationAuditComparisonRowProps['t'],
) {
  switch (level) {
    case 'high':
      return t({ zh: '高疑似', en: 'High suspicion' })
    case 'medium':
      return t({ zh: '中疑似', en: 'Medium suspicion' })
    case 'low':
      return t({ zh: '低疑似', en: 'Low suspicion' })
    case 'none':
      return t({ zh: '暂不复核', en: 'Keep' })
  }
}

function buildVariant(
  baseAnimation: ChampionAnimation,
  metrics: AnimationAuditSequenceMetrics,
  label: string,
  badge?: string,
): AnimationAuditVariant {
  return {
    key: `${baseAnimation.id}:${label}:${String(metrics.sequenceIndex)}`,
    label,
    metrics,
    animation: {
      ...baseAnimation,
      defaultSequenceIndex: metrics.sequenceIndex,
      defaultFrameIndex: metrics.frameIndex,
    },
    ...(badge != null && badge !== '' ? { badge } : {}),
  }
}

export function AnimationAuditComparisonRow({
  entry,
  animation,
  fallbackSrc,
  locale,
  t,
  feedback,
  onVerdictChange,
  onTagToggle,
  onNoteChange,
  onClearFeedback,
}: AnimationAuditComparisonRowProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const title = getPrimaryLocalizedText(entry.illustrationName, locale)
  const subtitle = getPrimaryLocalizedText(entry.championName, locale)
  const variants = [
    buildVariant(animation, entry.current, t({ zh: '当前默认', en: 'Current default' })),
    buildVariant(
      animation,
      entry.recommended,
      t({ zh: '推荐候选', en: 'Recommended' }),
      entry.recommended.sequenceIndex === entry.current.sequenceIndex
        ? t({ zh: '保持不变', en: 'Keep' })
        : t({ zh: '更像待机', en: 'Better idle' }),
    ),
  ]
  const alternate = entry.candidates.find(
    (candidate) => candidate.sequenceIndex !== entry.recommended.sequenceIndex,
  )

  if (alternate) {
    variants.push(
      buildVariant(animation, alternate, t({ zh: '备选候选', en: 'Alternate' }), t({ zh: '再看一眼', en: 'Second look' })),
    )
  }

  return (
    <article className={`animation-audit-row animation-audit-row--${entry.suspicionLevel}`}>
      <header className="animation-audit-row__header">
        <div className="animation-audit-row__title-stack">
          <div className="animation-audit-row__eyebrow-row">
            <span className="animation-audit-row__kind">{entry.kind === 'hero-base' ? t({ zh: '英雄本体', en: 'Hero base' }) : t({ zh: '皮肤', en: 'Skin' })}</span>
            <span className={`animation-audit-row__level animation-audit-row__level--${entry.suspicionLevel}`}>
              {buildSuspicionLevelLabel(entry.suspicionLevel, t)}
            </span>
            <span className="animation-audit-row__score">Δ {entry.suspicionScore.toFixed(2)}</span>
          </div>
          <h2 className="animation-audit-row__title">{title}</h2>
          <p className="animation-audit-row__subtitle">
            {subtitle} · {t({ zh: `座位 ${String(entry.seat)}`, en: `Seat ${String(entry.seat)}` })} · {t({ zh: `${String(entry.sequenceCount)} 条 sequence`, en: `${String(entry.sequenceCount)} sequences` })}
          </p>
        </div>
        <button
          type="button"
          className="animation-audit-row__toggle"
          onClick={() => setIsPlaying((value) => !value)}
        >
          {isPlaying ? <Pause aria-hidden="true" strokeWidth={1.9} /> : <Play aria-hidden="true" strokeWidth={1.9} />}
          {isPlaying ? t({ zh: '暂停这一行', en: 'Pause row' }) : t({ zh: '播放这一行', en: 'Play row' })}
        </button>
      </header>

      {entry.suspicionSignals.length > 0 ? (
        <div className="animation-audit-row__signal-row">
          {entry.suspicionSignals.map((signal) => (
            <span key={`${entry.id}-${signal}`} className="animation-audit-row__signal-chip">
              {buildSignalLabel(signal, t)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="animation-audit-row__comparison-grid">
        {variants.map((variant) => {
          const facts: ReadonlyArray<{ label: string; value: string }> = [
            { label: t({ zh: '可见率', en: 'Visibility' }), value: formatPercent(variant.metrics.averageVisiblePieceRatio) },
            { label: t({ zh: '持续部件', en: 'Persistent' }), value: formatPercent(variant.metrics.persistentPieceRatio) },
            { label: t({ zh: '轮廓覆盖', en: 'Coverage' }), value: formatPercent(variant.metrics.boundsAreaRatio) },
            { label: t({ zh: '运动强度', en: 'Motion' }), value: formatMotion(variant.metrics.averageMotion) },
            { label: t({ zh: '评分', en: 'Score' }), value: variant.metrics.score.toFixed(2) },
            { label: t({ zh: '部件数', en: 'Pieces' }), value: String(variant.metrics.pieceCount) },
          ]

          return (
          <section key={variant.key} className="animation-audit-variant">
            <div className="animation-audit-variant__header">
              <div>
                <p className="animation-audit-variant__label">{variant.label}</p>
                <p className="animation-audit-variant__meta">
                  seq {variant.metrics.sequenceIndex} · frame {variant.metrics.frameIndex}
                </p>
              </div>
              {variant.badge != null && variant.badge !== '' ? <span className="animation-audit-variant__badge">{variant.badge}</span> : null}
            </div>

            <div className="animation-audit-variant__stage">
              <SkelAnimCanvas
                className="animation-audit-variant__preview"
                animation={variant.animation}
                fallbackSrc={fallbackSrc}
                alt={`${title} ${variant.label}`}
                labels={{
                  play: t({ zh: '播放动画', en: 'Play animation' }),
                  pause: t({ zh: '暂停动画', en: 'Pause animation' }),
                  reducedMotion: t({ zh: '已遵循减少动态偏好', en: 'Reduced motion is active' }),
                  error: t({ zh: '动态预览加载失败', en: 'Animated preview failed to load' }),
                  animated: t({ zh: '动态预览已启用', en: 'Animated preview enabled' }),
                  fallback: t({ zh: '当前显示静态立绘', en: 'Showing static illustration' }),
                }}
                playbackMode={isPlaying ? 'play' : 'pause'}
                showControls={false}
                showStatus={false}
              />
            </div>

            <dl className="animation-audit-variant__facts">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          )
        })}
      </div>

      <AnimationAuditRowFeedback
        entryId={entry.id}
        hasAlternate={alternate !== undefined}
        feedback={feedback}
        t={t}
        onVerdictChange={onVerdictChange}
        onTagToggle={onTagToggle}
        onNoteChange={onNoteChange}
        onClearFeedback={onClearFeedback}
      />
    </article>
  )
}
