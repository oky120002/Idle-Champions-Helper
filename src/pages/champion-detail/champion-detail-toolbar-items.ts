import { createWorkbenchShareItem } from '../../components/workbench/WorkbenchToolbarItemBuilders'
import type { WorkbenchToolbarItemConfig } from '../../components/workbench/WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from '../../components/workbench/useWorkbenchShareLink'

interface ChampionDetailToolbarItemOptions {
  shareLinkState: WorkbenchShareLinkState
  copyCurrentLink: () => Promise<void>
}

export function buildChampionDetailToolbarItems({
  shareLinkState,
  copyCurrentLink,
}: ChampionDetailToolbarItemOptions): WorkbenchToolbarItemConfig[] {
  return [
    createWorkbenchShareItem({
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]
}
