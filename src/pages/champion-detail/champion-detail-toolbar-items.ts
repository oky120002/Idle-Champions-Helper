import type { LocaleText } from '../../app/i18n'
import {
  createWorkbenchBadgeItem,
  createWorkbenchShareItem,
} from '../../components/workbench/WorkbenchToolbarItemBuilders'
import type { WorkbenchToolbarItemConfig } from '../../components/workbench/WorkbenchToolbarItems'
import type { WorkbenchShareLinkState } from '../../components/workbench/useWorkbenchShareLink'
import type { ChampionDetail } from '../../domain/types'
import type { DetailFieldProps, DetailSectionBadge, DetailSectionId } from './types'

type Translate = (text: LocaleText) => string

interface ChampionDetailToolbarItemOptions {
  detail: ChampionDetail | null
  activeSectionId: DetailSectionId
  activeSectionIndex: number
  sectionCount: number
  upgradeSectionBadges: DetailSectionBadge[]
  featSectionBadges: DetailSectionBadge[]
  ledgerRowsCount: number
  visibleLedgerRowsCount: number
  overviewFields: DetailFieldProps[]
  shareLinkState: WorkbenchShareLinkState
  copyCurrentLink: () => Promise<void>
  t: Translate
}

function toBadgeItems(prefix: string, badges: DetailSectionBadge[]): WorkbenchToolbarItemConfig[] {
  return badges.map((badge) =>
    createWorkbenchBadgeItem({
      id: `${prefix}-${badge.label}`,
      label: `${badge.label} ${badge.value}`,
    }),
  )
}

function buildActiveSectionBadgeItems({
  detail,
  activeSectionId,
  featSectionBadges,
  ledgerRowsCount,
  visibleLedgerRowsCount,
  overviewFields,
  t,
}: Omit<
  ChampionDetailToolbarItemOptions,
  'activeSectionIndex' | 'sectionCount' | 'upgradeSectionBadges' | 'shareLinkState' | 'copyCurrentLink'
>): WorkbenchToolbarItemConfig[] {
  if (detail == null) {
    return []
  }

  if (activeSectionId === 'specializations') {
    return []
  }

  if (activeSectionId === 'abilities') {
    return [
      createWorkbenchBadgeItem({
        id: 'active-abilities-event-upgrades',
        label: t({ zh: `活动升级 ${detail.attacks.eventUpgrades.length}`, en: `Event upgrades ${detail.attacks.eventUpgrades.length}` }),
      }),
      createWorkbenchBadgeItem({
        id: 'active-abilities-ledger',
        label: t({ zh: `等级升级 ${visibleLedgerRowsCount}/${ledgerRowsCount}`, en: `Level upgrades ${visibleLedgerRowsCount}/${ledgerRowsCount}` }),
      }),
    ]
  }

  if (activeSectionId === 'loot') {
    const count = detail.loot?.length ?? 0

    return [
      createWorkbenchBadgeItem({
        id: 'active-loot-items',
        label: t({ zh: `装备 ${count}`, en: `Items ${count}` }),
      }),
    ]
  }

  if (activeSectionId === 'legendary') {
    const count = detail.legendaryEffects?.length ?? 0

    return [
      createWorkbenchBadgeItem({
        id: 'active-legendary-effects',
        label: t({ zh: `效果 ${count}`, en: `Effects ${count}` }),
      }),
    ]
  }

  if (activeSectionId === 'feats') {
    return toBadgeItems('active-feats', featSectionBadges)
  }

  if (activeSectionId === 'skins') {
    return [
      createWorkbenchBadgeItem({
        id: 'active-skins-count',
        label: t({ zh: `皮肤 ${detail.skins.length}`, en: `Skins ${detail.skins.length}` }),
      }),
    ]
  }

  return [
    createWorkbenchBadgeItem({
      id: 'active-story-fields',
      label: t({ zh: `字段 ${overviewFields.length}`, en: `Fields ${overviewFields.length}` }),
    }),
    createWorkbenchBadgeItem({
      id: 'active-story-raw',
      label: t({ zh: '原始 7', en: 'Raw 7' }),
    }),
  ]
}

export function buildChampionDetailToolbarItems({
  detail,
  activeSectionId,
  activeSectionIndex,
  sectionCount,
  featSectionBadges,
  ledgerRowsCount,
  visibleLedgerRowsCount,
  overviewFields,
  shareLinkState,
  copyCurrentLink,
  t,
}: ChampionDetailToolbarItemOptions): WorkbenchToolbarItemConfig[] {
  return [
    ...buildActiveSectionBadgeItems({
      detail,
      activeSectionId,
      featSectionBadges,
      ledgerRowsCount,
      visibleLedgerRowsCount,
      overviewFields,
      t,
    }),
    createWorkbenchBadgeItem({
      id: 'section-progress',
      label: t({ zh: `章节 ${activeSectionIndex + 1}/${sectionCount}`, en: `Section ${activeSectionIndex + 1}/${sectionCount}` }),
      tone: 'muted',
      hidden: detail == null,
    }),
    createWorkbenchBadgeItem({
      id: 'skin-count',
      tone: 'muted',
      label: detail ? t({ zh: `${detail.skins.length} 套皮肤`, en: `${detail.skins.length} skins` }) : '',
      hidden: detail == null || activeSectionId === 'skins',
    }),
    createWorkbenchShareItem({
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]
}
