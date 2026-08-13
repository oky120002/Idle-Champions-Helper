import { ChevronDown, Clipboard, Eraser } from 'lucide-react'
import type { LocaleText, TranslateParams } from '../../app/i18n'
import type { AnimationAuditCopyState } from './types'

interface AnimationAuditFeedbackExportPanelProps {
  readonly feedbackSummary: {
    selected: number
    withVerdict: number
    withTags: number
    withNotes: number
  }
  readonly hasFeedback: boolean
  readonly feedbackCopyState: AnimationAuditCopyState
  readonly feedbackPreviewJson: string
  readonly onCopy: () => void
  readonly onClearAll: () => void
  readonly t: (text: string | LocaleText, params?: TranslateParams) => string
}

function buildFeedbackCopyStateLabel(
  state: AnimationAuditCopyState,
  t: AnimationAuditFeedbackExportPanelProps['t'],
) {
  switch (state) {
    case 'idle':
      return t("页面会把勾选暂存在本地浏览器里，刷新也还在。")
    case 'success':
      return t("已复制到剪贴板，直接贴给我就行。")
    case 'error':
      return t("复制失败，可先展开下面的 JSON 手动复制。")
  }
}

function buildFeedbackStatusClassName(state: AnimationAuditCopyState) {
  switch (state) {
    case 'error':
      return 'animation-audit-feedback-export__status animation-audit-feedback-export__status--error'
    case 'success':
      return 'animation-audit-feedback-export__status animation-audit-feedback-export__status--success'
    case 'idle':
      return 'animation-audit-feedback-export__status'
  }
}

export function AnimationAuditFeedbackExportPanel({
  feedbackSummary,
  hasFeedback,
  feedbackCopyState,
  feedbackPreviewJson,
  onCopy,
  onClearAll,
  t,
}: AnimationAuditFeedbackExportPanelProps) {
  return (
    <section className="animation-audit-feedback-export">
      <div className="animation-audit-feedback-export__copy">
        <p className="animation-audit-feedback-export__eyebrow">{t("反馈收集")}</p>
        <h3 className="animation-audit-feedback-export__title">{t("勾完以后，一键复制 JSON 给我")}</h3>
        <p className="animation-audit-feedback-export__description">
          {t("每行先选一个结论，再勾问题标签；如果有特别怪的地方，再补一句备注。")}
        </p>
      </div>

      <div className="animation-audit-feedback-export__stats">
        <div className="animation-audit-feedback-export__stat">
          <span>{t("已勾选条目")}</span>
          <strong>{feedbackSummary.selected}</strong>
        </div>
        <div className="animation-audit-feedback-export__stat">
          <span>{t("有明确结论")}</span>
          <strong>{feedbackSummary.withVerdict}</strong>
        </div>
        <div className="animation-audit-feedback-export__stat">
          <span>{t("有问题标签")}</span>
          <strong>{feedbackSummary.withTags}</strong>
        </div>
        <div className="animation-audit-feedback-export__stat">
          <span>{t("有备注")}</span>
          <strong>{feedbackSummary.withNotes}</strong>
        </div>
      </div>

      <div className="animation-audit-feedback-export__actions">
        <button
          type="button"
          className="animation-audit-feedback-export__button"
          onClick={onCopy}
          disabled={!hasFeedback}
        >
          <Clipboard aria-hidden="true" strokeWidth={1.9} />
          {t("复制已勾选 JSON")}
        </button>
        <button
          type="button"
          className="animation-audit-feedback-export__button animation-audit-feedback-export__button--ghost"
          onClick={onClearAll}
          disabled={!hasFeedback}
        >
          <Eraser aria-hidden="true" strokeWidth={1.9} />
          {t("清空全部勾选")}
        </button>
      </div>

      <p className={buildFeedbackStatusClassName(feedbackCopyState)}>
        {buildFeedbackCopyStateLabel(feedbackCopyState, t)}
      </p>

      {hasFeedback ? (
        <details className="animation-audit-feedback-export__preview">
          <summary>
            <ChevronDown aria-hidden="true" strokeWidth={1.8} />
            {t("展开 JSON 预览（复制失败时可手动复制）")}
          </summary>
          <pre>{feedbackPreviewJson}</pre>
        </details>
      ) : null}
    </section>
  )
}
