import type { ReactNode } from 'react'
import type { LocaleText } from '../../app/i18n'
import { createWorkbenchShareItem } from '../../components/workbench/WorkbenchToolbarItemBuilders'
import type { WorkbenchToolbarItemConfig } from '../../components/workbench/WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from '../../components/workbench/useWorkbenchShareLink'

interface ChampionDetailToolbarItemOptions {
  t: (text: LocaleText) => string
  backLabel?: string
  backIcon?: ReactNode
  onBack?: (() => void | Promise<void>) | undefined
  shareLinkState: WorkbenchShareLinkState
  copyCurrentLink: () => Promise<void>
}

export function buildChampionDetailActionToolbarItems({
  t,
  backLabel,
  backIcon,
  onBack,
  shareLinkState,
  copyCurrentLink,
}: ChampionDetailToolbarItemOptions): WorkbenchToolbarItemConfig[] {
  return [
    ...(onBack !== undefined
      ? [
          {
            id: 'back-to-champions',
            kind: 'button' as const,
            label: '',
            title: backLabel ?? t({ zh: '返回英雄筛选', en: 'Back to champions' }),
            icon: backIcon,
            tone: 'share' as const,
            className: 'champion-detail-workbench__toolbar-back',
            onClick: onBack,
          },
        ]
      : []),
    createWorkbenchShareItem({
      t,
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]
}
