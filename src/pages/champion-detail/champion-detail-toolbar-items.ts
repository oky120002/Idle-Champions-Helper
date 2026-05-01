import type { LocaleText } from '../../app/i18n'
import { createWorkbenchShareItem } from '../../components/workbench/WorkbenchToolbarItemBuilders'
import type { WorkbenchToolbarItemConfig } from '../../components/workbench/WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from '../../components/workbench/useWorkbenchShareLink'

interface ChampionDetailToolbarItemOptions {
  t: (text: LocaleText) => string
  shareLinkState: WorkbenchShareLinkState
  copyCurrentLink: () => Promise<void>
}

export function buildChampionDetailToolbarItems({
  t,
  shareLinkState,
  copyCurrentLink,
}: ChampionDetailToolbarItemOptions): WorkbenchToolbarItemConfig[] {
  return [
    createWorkbenchShareItem({
      t,
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]
}
