import { ANIMATION_AUDIT_FEEDBACK_TAGS } from './feedback'
import type {
  AnimationAuditFeedbackDraft,
  AnimationAuditFeedbackTag,
  AnimationAuditFeedbackVerdict,
} from './types'

interface AnimationAuditRowFeedbackProps {
  entryId: string
  hasAlternate: boolean
  feedback: AnimationAuditFeedbackDraft
  t: (text: { zh: string; en: string }) => string
  onVerdictChange: (entryId: string, verdict: AnimationAuditFeedbackVerdict | null) => void
  onTagToggle: (entryId: string, tag: AnimationAuditFeedbackTag) => void
  onNoteChange: (entryId: string, note: string) => void
  onClearFeedback: (entryId: string) => void
}

function buildVerdictLabel(
  verdict: AnimationAuditFeedbackVerdict,
  t: AnimationAuditRowFeedbackProps['t'],
) {
  switch (verdict) {
    case 'current':
      return t({ zh: '当前默认就对', en: 'Current default is right' })
    case 'recommended':
      return t({ zh: '推荐候选更对', en: 'Recommended looks better' })
    case 'alternate':
      return t({ zh: '备选更对', en: 'Alternate looks better' })
    case 'manual':
      return t({ zh: '都不对，还得另找', en: 'Neither works, needs manual pick' })
  }
}

function buildFeedbackTagLabel(tag: AnimationAuditFeedbackTag, t: AnimationAuditRowFeedbackProps['t']) {
  switch (tag) {
    case 'joint_dislocation':
      return t({ zh: '关节脱位 / 骨架怪', en: 'Joint or rig looks broken' })
    case 'not_idle_like':
      return t({ zh: '不像游戏待机', en: 'Does not feel idle-like' })
    case 'motion_too_busy':
      return t({ zh: '动作太躁', en: 'Motion is too busy' })
    case 'sparse_or_cropped':
      return t({ zh: '轮廓或部件残缺', en: 'Coverage or pieces look sparse' })
    case 'samey_template':
      return t({ zh: '和别的英雄太像', en: 'Feels too samey across heroes' })
  }
}

export function AnimationAuditRowFeedback({
  entryId,
  hasAlternate,
  feedback,
  t,
  onVerdictChange,
  onTagToggle,
  onNoteChange,
  onClearFeedback,
}: AnimationAuditRowFeedbackProps) {
  const verdictOptions: AnimationAuditFeedbackVerdict[] = hasAlternate
    ? ['current', 'recommended', 'alternate', 'manual']
    : ['current', 'recommended', 'manual']
  const hasFeedback = feedback.verdict !== null || feedback.tags.length > 0 || feedback.note.length > 0

  return (
    <section className="animation-audit-feedback-card">
      <div className="animation-audit-feedback-card__header">
        <div className="animation-audit-feedback-card__copy">
          <p className="animation-audit-feedback-card__eyebrow">{t({ zh: '你的反馈', en: 'Your feedback' })}</p>
          <h3 className="animation-audit-feedback-card__title">
            {t({ zh: '先选结论，再补几个问题标签', en: 'Pick a verdict, then add a few issue tags' })}
          </h3>
        </div>
        {hasFeedback ? (
          <button
            type="button"
            className="animation-audit-feedback-card__clear"
            onClick={() => onClearFeedback(entryId)}
          >
            {t({ zh: '清空本行', en: 'Clear row' })}
          </button>
        ) : null}
      </div>

      <div className="animation-audit-feedback-card__group">
        <span className="animation-audit-feedback-card__label">{t({ zh: '结论', en: 'Verdict' })}</span>
        <div className="animation-audit-feedback-card__option-row">
          {verdictOptions.map((verdict) => (
            <button
              key={`${entryId}-${verdict}`}
              type="button"
              className={
                feedback.verdict === verdict
                  ? 'animation-audit-feedback-chip animation-audit-feedback-chip--active'
                  : 'animation-audit-feedback-chip'
              }
              onClick={() => onVerdictChange(entryId, feedback.verdict === verdict ? null : verdict)}
            >
              {buildVerdictLabel(verdict, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="animation-audit-feedback-card__group">
        <span className="animation-audit-feedback-card__label">{t({ zh: '问题标签', en: 'Issue tags' })}</span>
        <div className="animation-audit-feedback-card__option-row">
          {ANIMATION_AUDIT_FEEDBACK_TAGS.map((tag) => {
            const checked = feedback.tags.includes(tag)

            return (
              <label
                key={`${entryId}-${tag}`}
                className={
                  checked
                    ? 'animation-audit-feedback-chip animation-audit-feedback-chip--checkbox animation-audit-feedback-chip--active'
                    : 'animation-audit-feedback-chip animation-audit-feedback-chip--checkbox'
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onTagToggle(entryId, tag)}
                />
                <span>{buildFeedbackTagLabel(tag, t)}</span>
              </label>
            )
          })}
        </div>
      </div>

      <label className="animation-audit-feedback-card__note">
        <span className="animation-audit-feedback-card__label">{t({ zh: '备注（可选）', en: 'Note (optional)' })}</span>
        <textarea
          rows={2}
          value={feedback.note}
          onChange={(event) => onNoteChange(entryId, event.target.value)}
          placeholder={t({
            zh: '例如：武器抖动怪，或者 seq 2 比推荐更接近游戏。',
            en: 'For example: weapon jitters oddly, or sequence 2 feels closer to the game.',
          })}
        />
      </label>
    </section>
  )
}
