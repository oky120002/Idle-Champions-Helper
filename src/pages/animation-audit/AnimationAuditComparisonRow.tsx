/* eslint-disable max-lines -- 动画审计对比行：变体网格 + 反馈面板紧耦合，拆分会增加常见修改的打开文件数 */
import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { AppLocale , LocaleText, TranslateParams} from '../../app/i18n'
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
  readonly t: (text: string | LocaleText, params?: TranslateParams) => string
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
      return t("综合评分明显更优")
    case 'visibility_gap':
      return t("可见部件更完整")
    case 'persistent_gap':
      return t("持续可见部件更多")
    case 'coverage_gap':
      return t("轮廓覆盖更完整")
    case 'motion_gap':
      return t("动作节奏更接近待机")
    case 'sparse_default':
      return t("当前默认序列偏碎")
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
      return t("高疑似")
    case 'medium':
      return t("中疑似")
    case 'low':
      return t("低疑似")
    case 'none':
      return t("暂不复核")
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
    buildVariant(animation, entry.current, t("当前默认")),
    buildVariant(
      animation,
      entry.recommended,
      t("推荐候选"),
      entry.recommended.sequenceIndex === entry.current.sequenceIndex
        ? t("保持不变")
        : t("更像待机"),
    ),
  ]
  const alternate = entry.candidates.find(
    (candidate) => candidate.sequenceIndex !== entry.recommended.sequenceIndex,
  )

  if (alternate) {
    variants.push(
      buildVariant(animation, alternate, t("备选候选"), t("再看一眼")),
    )
  }

  return (
    <article className={`animation-audit-row animation-audit-row--${entry.suspicionLevel}`}>
      <header className="animation-audit-row__header">
        <div className="animation-audit-row__title-stack">
          <div className="animation-audit-row__eyebrow-row">
            <span className="animation-audit-row__kind">{entry.kind === 'hero-base' ? t("英雄本体") : t("皮肤")}</span>
            <span className={`animation-audit-row__level animation-audit-row__level--${entry.suspicionLevel}`}>
              {buildSuspicionLevelLabel(entry.suspicionLevel, t)}
            </span>
            <span className="animation-audit-row__score">Δ {entry.suspicionScore.toFixed(2)}</span>
          </div>
          <h2 className="animation-audit-row__title">{title}</h2>
          <p className="animation-audit-row__subtitle">
            {subtitle} · {t("座位 {p0}", { p0: String(entry.seat) })} · {t("{p0} 条 sequence", { p0: String(entry.sequenceCount) })}
          </p>
        </div>
        <button
          type="button"
          className="animation-audit-row__toggle"
          onClick={() => setIsPlaying((value) => !value)}
        >
          {isPlaying ? <Pause aria-hidden="true" strokeWidth={1.9} /> : <Play aria-hidden="true" strokeWidth={1.9} />}
          {isPlaying ? t("暂停这一行") : t("播放这一行")}
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
            { label: t("可见率"), value: formatPercent(variant.metrics.averageVisiblePieceRatio) },
            { label: t("持续部件"), value: formatPercent(variant.metrics.persistentPieceRatio) },
            { label: t("轮廓覆盖"), value: formatPercent(variant.metrics.boundsAreaRatio) },
            { label: t("运动强度"), value: formatMotion(variant.metrics.averageMotion) },
            { label: t("评分"), value: variant.metrics.score.toFixed(2) },
            { label: t("部件数"), value: String(variant.metrics.pieceCount) },
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
                  play: t("播放动画"),
                  pause: t("暂停动画"),
                  reducedMotion: t("已遵循减少动态偏好"),
                  error: t("动态预览加载失败"),
                  animated: t("动态预览已启用"),
                  fallback: t("当前显示静态立绘"),
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
