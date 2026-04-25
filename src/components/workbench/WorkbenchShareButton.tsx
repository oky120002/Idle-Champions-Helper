import { useI18n } from '../../app/i18n'
import { ActionButton } from '../ActionButton'
import type { WorkbenchShareState } from './WorkbenchScaffold'

interface WorkbenchShareButtonProps {
  state: WorkbenchShareState
  onCopy: () => void | Promise<void>
  className?: string
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchShareButton({
  state,
  onCopy,
  className,
}: WorkbenchShareButtonProps) {
  const { t } = useI18n()
  const label =
    state === 'success'
      ? t({ zh: '已复制链接', en: 'Link copied' })
      : state === 'error'
        ? t({ zh: '复制失败', en: 'Copy failed' })
        : t({ zh: '复制当前链接', en: 'Copy current link' })

  return (
    <ActionButton
      tone="ghost"
      compact
      toggled={state === 'success'}
      className={joinClasses(
        'workbench-page__toolbar-action',
        'workbench-page__toolbar-action--share',
        state === 'success' && 'workbench-page__toolbar-action--success',
        state === 'error' && 'workbench-page__toolbar-action--error',
        className,
      )}
      onClick={onCopy}
    >
      {label}
    </ActionButton>
  )
}
