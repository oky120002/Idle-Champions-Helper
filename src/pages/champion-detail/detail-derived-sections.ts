import type { AppLocale } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail, ChampionUpgradeDetail } from '../../domain/types'
import { buildUpgradeCategoryMeta, buildUpgradePresentation } from './effect-model'
import { buildOverviewPropertyFields } from './summary-model'
import { formatDateText, formatTimestamp } from './detail-value-formatters'
import type {
  DetailFieldProps,
  EffectContext,
  LedgerUpgradeRow,
  UpgradeCategoryMeta,
} from './types'

function isSpotlightUpgrade(upgrade: ChampionUpgradeDetail): boolean {
  const hasMeta =
    Boolean(upgrade.name) ||
    Boolean(upgrade.specializationName) ||
    Boolean(upgrade.specializationDescription) ||
    Boolean(upgrade.tipText)
  return (
    hasMeta ||
    Boolean(upgrade.effectDefinition) ||
    upgrade.upgradeType === 'unlock_ability' ||
    upgrade.upgradeType === 'unlock_ultimate'
  )
}

export function buildSpotlightUpgrades(detail: ChampionDetail | null): ChampionUpgradeDetail[] {
  if (!detail) {
    return []
  }

  return detail.upgrades.filter(isSpotlightUpgrade)
}

export function buildLedgerUpgrades(detail: ChampionDetail | null): ChampionUpgradeDetail[] {
  if (!detail) {
    return []
  }

  return detail.upgrades.filter((upgrade) => !isSpotlightUpgrade(upgrade))
}

export function buildLedgerRows(
  ledgerUpgrades: ChampionUpgradeDetail[],
  effectContext: EffectContext | null,
  locale: AppLocale,
  upgradePresentations: Map<string, ReturnType<typeof buildUpgradePresentation>>,
): LedgerUpgradeRow[] {
  if (!effectContext) {
    return []
  }

  return ledgerUpgrades.map((upgrade) => {
    const presentation = upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext)

    return {
      upgrade,
      presentation,
      category: buildUpgradeCategoryMeta(presentation.typeLabel, locale),
    }
  })
}

export function buildLedgerFilterOptions(
  ledgerRows: LedgerUpgradeRow[],
  locale: AppLocale,
): Array<UpgradeCategoryMeta & { count: number }> {
  const optionMap = new Map<string, UpgradeCategoryMeta & { count: number }>()

  ledgerRows.forEach((row) => {
    const current = optionMap.get(row.category.key)

    if (current) {
      current.count += 1
      return
    }

    optionMap.set(row.category.key, {
      ...row.category,
      count: 1,
    })
  })

  return Array.from(optionMap.values()).sort((left, right) => {
    if (left.defaultEnabled !== right.defaultEnabled) {
      return left.defaultEnabled ? 1 : -1
    }

    if (left.count !== right.count) {
      return right.count - left.count
    }

    return left.label.localeCompare(right.label, locale)
  })
}

type Translation = (text: { zh: string; en: string }) => string

function buildOptionalDateFields(detail: ChampionDetail, locale: AppLocale, t: Translation): DetailFieldProps[] {
  const fields: DetailFieldProps[] = []

  if (detail.lastReworkDate != null && detail.lastReworkDate !== '') {
    fields.push({
      label: t({ zh: '最后重做', en: 'Last rework' }),
      value: formatDateText(detail.lastReworkDate, locale),
    })
  }

  if (detail.availability.nextEventTimestamp != null && detail.availability.nextEventTimestamp > 0) {
    fields.push({
      label: t({ zh: '下次活动时间', en: 'Next event time' }),
      value: formatTimestamp(detail.availability.nextEventTimestamp, locale),
    })
  }

  return fields
}

export function buildOverviewFields(options: {
  detail: ChampionDetail | null
  locale: AppLocale
  t: Translation
  effectContext: EffectContext | null
}): DetailFieldProps[] {
  const { detail, locale, t, effectContext } = options

  if (!detail) {
    return []
  }

  return [
    {
      label: t({ zh: 'Seat', en: 'Seat' }),
      value: locale === 'zh-CN' ? `${String(detail.summary.seat)} 号位` : `Seat ${String(detail.summary.seat)}`,
    },
    ...(detail.eventName
      ? [
          {
            label: t({ zh: '活动名', en: 'Event name' }),
            value: getPrimaryLocalizedText(detail.eventName, locale),
          },
        ]
      : []),
    {
      label: t({ zh: '首次可用', en: 'Date available' }),
      value: formatDateText(detail.dateAvailable, locale),
    },
    ...buildOptionalDateFields(detail, locale, t),
    {
      label: t({ zh: '默认天赋槽解锁', en: 'Default feat slots' }),
      value:
        detail.defaultFeatSlotUnlocks.length > 0
          ? detail.defaultFeatSlotUnlocks.join(' / ')
          : t({ zh: '暂无', en: 'None yet' }),
    },
    ...buildOverviewPropertyFields(detail, locale, effectContext),
  ]
}
