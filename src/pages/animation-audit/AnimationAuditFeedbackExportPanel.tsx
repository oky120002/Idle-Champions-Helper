import { ChevronDown, Clipboard, Eraser } from 'lucide-react'
import type { AnimationAuditCopyState } from './types'

interface AnimationAuditFeedbackExportPanelProps {
  feedbackSummary: {
    selected: number
    withVerdict: number
    withTags: number
    withNotes: number
  }
  hasFeedback: boolean
  feedbackCopyState: AnimationAuditCopyState
  feedbackPreviewJson: string
  onCopy: () => void
  onClearAll: () => void
  t: (text: { zh: string; en: string }) => string
}

function buildFeedbackCopyStateLabel(
  state: AnimationAuditCopyState,
  t: AnimationAuditFeedbackExportPanelProps['t'],
) {
  switch (state) {
    case 'idle':
      return t({ zh: '页面会把勾选暂存在本地浏览器里，刷新也还在。', en: 'Selections are stored locally in this browser, even after refresh.' })
    case 'success':
      return t({ zh: '已复制到剪贴板，直接贴给我就行。', en: 'Copied to clipboard. Paste it back to me.' })
    case 'error':
      return t({ zh: '复制失败，可先展开下面的 JSON 手动复制。', en: 'Copy failed. Expand the JSON preview and copy it manually.' })
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
        <p className="animation-audit-feedback-export__eyebrow">{t({ zh: '反馈收集', en: 'Feedback capture' })}</p>
        <h3 className="animation-audit-feedback-export__title">{t({ zh: '勾完以后，一键复制 JSON 给我', en: 'Select items, then copy the JSON in one click' })}</h3>
        <p className="animation-audit-feedback-export__description">
          {t({
            zh: '每行先选一个结论，再勾问题标签；如果有特别怪的地方，再补一句备注。',
            en: 'Pick one verdict per row, add issue tags, and leave a note only when something looks unusually odd.',
          })}
        </p>
      </div>

      <div className="animation-audit-feedback-export__stats">
        <div className="animation-audit-feedback-export__stat">
          <span>{t({ zh: '已勾选条目', en: 'Selected rows' })}</span>
          <strong>{feedbackSummary.selected}</strong>
        </div>
        <div className="animation-audit-feedback-export__stat">
          <span>{t({ zh: '有明确结论', en: 'With verdict' })}</span>
          <strong>{feedbackSummary.withVerdict}</strong>
        </div>
        <div className="animation-audit-feedback-export__stat">
          <span>{t({ zh: '有问题标签', en: 'With issue tags' })}</span>
          <strong>{feedbackSummary.withTags}</strong>
        </div>
        <div className="animation-audit-feedback-export__stat">
          <span>{t({ zh: '有备注', en: 'With notes' })}</span>
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
          {t({ zh: '复制已勾选 JSON', en: 'Copy selected JSON' })}
        </button>
        <button
          type="button"
          className="animation-audit-feedback-export__button animation-audit-feedback-export__button--ghost"
          onClick={onClearAll}
          disabled={!hasFeedback}
        >
          <Eraser aria-hidden="true" strokeWidth={1.9} />
          {t({ zh: '清空全部勾选', en: 'Clear all selections' })}
        </button>
      </div>

      <p
        className={
          feedbackCopyState === 'error'
            ? 'animation-audit-feedback-export__status animation-audit-feedback-export__status--error'
            : feedbackCopyState === 'success'
              ? 'animation-audit-feedback-export__status animation-audit-feedback-export__status--success'
              : 'animation-audit-feedback-export__status'
        }
      >
        {buildFeedbackCopyStateLabel(feedbackCopyState, t)}
      </p>

      {hasFeedback ? (
        <details className="animation-audit-feedback-export__preview">
          <summary>
            <ChevronDown aria-hidden="true" strokeWidth={1.8} />
            {t({ zh: '展开 JSON 预览（复制失败时可手动复制）', en: 'Expand JSON preview for manual copy' })}
          </summary>
          <pre>{feedbackPreviewJson}</pre>
        </details>
      ) : null}
    </section>
  )
}
