import type { ReactNode } from 'react'

/**
 * 通用确认弹窗（受控）：遮罩点击关闭、面板内点击不冒泡。
 * 复用 SkinArtworkDialog 的 dialog/backdrop/panel 三层结构，但样式独立（shared.controls 层）。
 * title 走 aria-label 供屏阅读器；正文与按钮区由调用方经 children 自由组织。
 */
interface ConfirmDialogProps {
  readonly open: boolean
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
}

export function ConfirmDialog({ open, title, onClose, children }: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="confirm-dialog__backdrop"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="confirm-dialog__panel">
        <h2 className="confirm-dialog__title">{title}</h2>
        {children}
      </div>
    </div>
  )
}
