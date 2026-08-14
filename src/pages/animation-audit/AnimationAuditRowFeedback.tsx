import type { MessageRef, TranslateParams } from '../../app/i18n'
import { ANIMATION_AUDIT_FEEDBACK_TAGS } from './feedback'
import type {
  AnimationAuditFeedbackDraft,
  AnimationAuditFeedbackTag,
  AnimationAuditFeedbackVerdict,
} from './types'

interface AnimationAuditRowFeedbackProps {
  readonly entryId: string
  readonly hasAlternate: boolean
  readonly feedback: AnimationAuditFeedbackDraft
  readonly t: (text: string | MessageRef, params?: TranslateParams) => string
  readonly onVerdictChange: (entryId: string, verdict: AnimationAuditFeedbackVerdict | null) => void
  readonly onTagToggle: (entryId: string, tag: AnimationAuditFeedbackTag) => void
  readonly onNoteChange: (entryId: string, note: string) => void
  readonly onClearFeedback: (entryId: string) => void
}

function buildVerdictLabel(
  verdict: AnimationAuditFeedbackVerdict,
  t: AnimationAuditRowFeedbackProps['t'],
) {
  switch (verdict) {
    case 'current':
      return t("当前默认就对")
    case 'recommended':
      return t("推荐候选更对")
    case 'alternate':
      return t("备选更对")
    case 'manual':
      return t("都不对，还得另找")
  }
}

function buildFeedbackTagLabel(tag: AnimationAuditFeedbackTag, t: AnimationAuditRowFeedbackProps['t']) {
  switch (tag) {
    case 'joint_dislocation':
      return t("关节脱位 / 骨架怪")
    case 'not_idle_like':
      return t("不像游戏待机")
    case 'motion_too_busy':
      return t("动作太躁")
    case 'sparse_or_cropped':
      return t("轮廓或部件残缺")
    case 'samey_template':
      return t("和别的英雄太像")
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
          <p className="animation-audit-feedback-card__eyebrow">{t("你的反馈")}</p>
          <h3 className="animation-audit-feedback-card__title">
            {t("先选结论，再补几个问题标签")}
          </h3>
        </div>
        {hasFeedback ? (
          <button
            type="button"
            className="animation-audit-feedback-card__clear"
            onClick={() => onClearFeedback(entryId)}
          >
            {t("清空本行")}
          </button>
        ) : null}
      </div>

      <div className="animation-audit-feedback-card__group">
        <span className="animation-audit-feedback-card__label">{t("结论")}</span>
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
        <span className="animation-audit-feedback-card__label">{t("问题标签")}</span>
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
        <span className="animation-audit-feedback-card__label">{t("备注（可选）")}</span>
        <textarea
          rows={2}
          value={feedback.note}
          onChange={(event) => onNoteChange(entryId, event.target.value)}
          placeholder={t("例如：武器抖动怪，或者 seq 2 比推荐更接近游戏。")}
        />
      </label>
    </section>
  )
}
