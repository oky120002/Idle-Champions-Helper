import { useMemo, useState } from 'react'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { buildOverviewPropertyFields } from './summary-model'
import { buildUpgradeCategoryMeta, buildUpgradePresentation, buildUpgradeReferenceLabel } from './effect-model'
import { formatNumber, isJsonObject } from './shared'
import type { AppLocale } from '../../app/i18n'
import type { EffectContext, LedgerUpgradeRow, UpgradeCategoryMeta, UpgradePresentation } from './types'

interface Translation {
  (text: { zh: string; en: string }): string
}

export function useChampionDetailDerived(
  detail: ChampionDetail | null,
  locale: AppLocale,
  t: Translation,
) {
  const attackLabelById = useMemo(() => {
    if (!detail) {
      return new Map<string, string>()
    }

    const nextMap = new Map<string, string>()

    if (detail.attacks.base) {
      nextMap.set(detail.attacks.base.id, getPrimaryLocalizedText(detail.attacks.base.name, locale))
    }

    if (detail.attacks.ultimate) {
      nextMap.set(detail.attacks.ultimate.id, getPrimaryLocalizedText(detail.attacks.ultimate.name, locale))
    }

    return nextMap
  }, [detail, locale])

  const upgradeLabelById = useMemo(() => {
    if (!detail) {
      return new Map<string, string>()
    }

    return new Map(
      detail.upgrades.map((upgrade) => [upgrade.id, buildUpgradeReferenceLabel(upgrade, locale, attackLabelById)]),
    )
  }, [attackLabelById, detail, locale])

  const effectContext = useMemo<EffectContext | null>(() => {
    if (!detail) {
      return null
    }

    return {
      locale,
      championName: getPrimaryLocalizedText(detail.summary.name, locale),
      attackLabelById,
      upgradeLabelById,
    }
  }, [attackLabelById, detail, locale, upgradeLabelById])

  const upgradePresentations = useMemo(() => {
    if (!detail || !effectContext) {
      return new Map<string, UpgradePresentation>()
    }

    return new Map(
      detail.upgrades.map((upgrade) => [upgrade.id, buildUpgradePresentation(upgrade, effectContext)]),
    )
  }, [detail, effectContext])

  const spotlightUpgrades = useMemo(() => {
    if (!detail) {
      return []
    }

    return detail.upgrades.filter(
      (upgrade) =>
        Boolean(upgrade.name) ||
        Boolean(upgrade.specializationName) ||
        Boolean(upgrade.specializationDescription) ||
        Boolean(upgrade.tipText) ||
        Boolean(upgrade.effectDefinition) ||
        upgrade.upgradeType === 'unlock_ability' ||
        upgrade.upgradeType === 'unlock_ultimate',
    )
  }, [detail])

  const ledgerUpgrades = useMemo(() => {
    if (!detail) {
      return []
    }

    return detail.upgrades.filter(
      (upgrade) =>
        !upgrade.name &&
        !upgrade.specializationName &&
        !upgrade.specializationDescription &&
        !upgrade.tipText &&
        !upgrade.effectDefinition &&
        upgrade.upgradeType !== 'unlock_ability' &&
        upgrade.upgradeType !== 'unlock_ultimate',
    )
  }, [detail])

  const ledgerRows = useMemo<LedgerUpgradeRow[]>(() => {
    if (!detail || !effectContext) {
      return []
    }

    return ledgerUpgrades.map((upgrade) => {
      const presentation =
        upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext)

      return {
        upgrade,
        presentation,
        category: buildUpgradeCategoryMeta(presentation.typeLabel, locale),
      }
    })
  }, [detail, effectContext, ledgerUpgrades, locale, upgradePresentations])

  const ledgerFilterOptions = useMemo(() => {
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
  }, [ledgerRows, locale])

  const defaultLedgerFilterKeys = useMemo(
    () => ledgerFilterOptions.filter((option) => option.defaultEnabled).map((option) => option.key),
    [ledgerFilterOptions],
  )
  const ledgerFilterSignature = useMemo(
    () =>
      ledgerFilterOptions
        .map((option) => `${option.key}:${option.defaultEnabled}:${option.count}`)
        .join('|'),
    [ledgerFilterOptions],
  )
  const [ledgerFilterSelection, setLedgerFilterSelection] = useState<{
    signature: string
    keys: string[]
  } | null>(null)
  const activeLedgerFilterKeys = useMemo(
    () =>
      ledgerFilterSelection?.signature === ledgerFilterSignature
        ? ledgerFilterSelection.keys
        : defaultLedgerFilterKeys,
    [defaultLedgerFilterKeys, ledgerFilterSelection, ledgerFilterSignature],
  )
  const activeLedgerFilterKeySet = useMemo(
    () => new Set(activeLedgerFilterKeys),
    [activeLedgerFilterKeys],
  )
  const visibleLedgerRows = useMemo(
    () => ledgerRows.filter((row) => activeLedgerFilterKeySet.has(row.category.key)),
    [activeLedgerFilterKeySet, ledgerRows],
  )
  const hiddenLedgerLabels = useMemo(
    () =>
      ledgerFilterOptions
        .filter((option) => !activeLedgerFilterKeySet.has(option.key))
        .map((option) => option.label),
    [activeLedgerFilterKeySet, ledgerFilterOptions],
  )
  const hiddenLedgerSummary = useMemo(() => {
    if (ledgerRows.length === 0) {
      return t({ zh: '当前没有可读的数值里程碑。', en: 'No numeric milestones are available here.' })
    }

    if (hiddenLedgerLabels.length === 0) {
      return t({ zh: '当前显示全部类型', en: 'Showing every type' })
    }

    if (hiddenLedgerLabels.length <= 2) {
      return locale === 'zh-CN'
        ? `已收起 ${hiddenLedgerLabels.join(' / ')}`
        : `Hidden: ${hiddenLedgerLabels.join(' / ')}`
    }

    return locale === 'zh-CN'
      ? `已收起 ${formatNumber(hiddenLedgerLabels.length, locale)} 类`
      : `${formatNumber(hiddenLedgerLabels.length, locale)} types hidden`
  }, [hiddenLedgerLabels, ledgerRows.length, locale, t])
  const hasCustomLedgerFilterState = useMemo(() => {
    if (activeLedgerFilterKeys.length !== defaultLedgerFilterKeys.length) {
      return true
    }

    return defaultLedgerFilterKeys.some((key) => !activeLedgerFilterKeySet.has(key))
  }, [activeLedgerFilterKeySet, activeLedgerFilterKeys.length, defaultLedgerFilterKeys])
  const isShowingAllLedgerTypes = activeLedgerFilterKeys.length === ledgerFilterOptions.length
  const toggleLedgerFilter = (key: string) => {
    const currentKeys =
      ledgerFilterSelection?.signature === ledgerFilterSignature
        ? ledgerFilterSelection.keys
        : defaultLedgerFilterKeys

    setLedgerFilterSelection({
      signature: ledgerFilterSignature,
      keys: currentKeys.includes(key)
        ? currentKeys.filter((item) => item !== key)
        : [...currentKeys, key],
    })
  }
  const resetLedgerFilters = () => {
    setLedgerFilterSelection(null)
  }
  const enableAllLedgerFilters = () => {
    setLedgerFilterSelection({
      signature: ledgerFilterSignature,
      keys: ledgerFilterOptions.map((option) => option.key),
    })
  }

  const upgradeSectionBadges = useMemo(
    () => [
      {
        label: t({ zh: '全部升级', en: 'All' }),
        value: formatNumber(detail?.upgrades.length ?? 0, locale),
      },
      {
        label: t({ zh: '重点升级', en: 'Spotlight' }),
        value: formatNumber(spotlightUpgrades.length, locale),
      },
      {
        label: t({ zh: '数值里程碑', en: 'Ledger' }),
        value:
          ledgerRows.length > 0
            ? `${formatNumber(visibleLedgerRows.length, locale)} / ${formatNumber(ledgerRows.length, locale)}`
            : formatNumber(ledgerRows.length, locale),
      },
    ],
    [detail?.upgrades.length, ledgerRows.length, locale, spotlightUpgrades.length, t, visibleLedgerRows.length],
  )

  const availableFeatCount = useMemo(() => {
    if (!detail) {
      return 0
    }

    return detail.feats.filter(
      (feat) => isJsonObject(feat.properties) && feat.properties.is_available === true,
    ).length
  }, [detail])

  const featSectionBadges = useMemo(
    () => [
      {
        label: t({ zh: '全部天赋', en: 'Total' }),
        value: formatNumber(detail?.feats.length ?? 0, locale),
      },
      {
        label: t({ zh: '默认槽', en: 'Default slots' }),
        value: formatNumber(detail?.defaultFeatSlotUnlocks.length ?? 0, locale),
      },
      {
        label: t({ zh: '当前可用', en: 'Available now' }),
        value: formatNumber(availableFeatCount, locale),
      },
    ],
    [availableFeatCount, detail?.defaultFeatSlotUnlocks.length, detail?.feats.length, locale, t],
  )

  const overviewFields = useMemo(() => {
    if (!detail) {
      return []
    }

    return [
      {
        label: t({ zh: 'Seat', en: 'Seat' }),
        value: locale === 'zh-CN' ? `${detail.summary.seat} 号位` : `Seat ${detail.summary.seat}`,
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
        value: detail.dateAvailable?.trim() || (locale === 'zh-CN' ? '暂无' : 'Not available'),
      },
      ...(detail.lastReworkDate
        ? [
            {
              label: t({ zh: '最后重做', en: 'Last rework' }),
              value: detail.lastReworkDate?.trim() || (locale === 'zh-CN' ? '暂无' : 'Not available'),
            },
          ]
        : []),
      ...(detail.availability.nextEventTimestamp && detail.availability.nextEventTimestamp > 0
        ? [
            {
              label: t({ zh: '下次活动时间', en: 'Next event time' }),
              value: new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(detail.availability.nextEventTimestamp * 1000)),
            },
          ]
        : []),
      {
        label: t({ zh: '默认天赋槽解锁', en: 'Default feat slots' }),
        value:
          detail.defaultFeatSlotUnlocks.length > 0
            ? detail.defaultFeatSlotUnlocks.join(' / ')
            : t({ zh: '暂无', en: 'None yet' }),
      },
      ...buildOverviewPropertyFields(detail, locale, effectContext),
    ]
  }, [detail, effectContext, locale, t])

  const summaryAvailabilityBadges = useMemo(() => {
    if (!detail) {
      return []
    }

    const badges: Array<{ key: string; label: string; active?: boolean }> = []

    if (detail.availability.isAvailable) {
      badges.push({
        key: 'available',
        label: t({ zh: '当前可用', en: 'Currently available' }),
        active: true,
      })
    }

    if (detail.availability.availableInShop) {
      badges.push({
        key: 'shop',
        label: t({ zh: '商店可得', en: 'Available in shop' }),
        active: true,
      })
    }

    if (detail.availability.availableInTimeGate) {
      badges.push({
        key: 'time-gate',
        label: t({ zh: '时间门可得', en: 'Available in Time Gate' }),
        active: true,
      })
    }

    if (detail.availability.availableInNextEvent) {
      badges.push({
        key: 'next-event',
        label: t({ zh: '下个活动可得', en: 'Available in next event' }),
        active: true,
      })
    }

    if (badges.length === 0) {
      badges.push({
        key: 'unavailable',
        label: t({ zh: '当前未开放', en: 'Currently unavailable' }),
      })
    }

    return badges
  }, [detail, t])

  return {
    effectContext,
    upgradePresentations,
    spotlightUpgrades,
    ledgerRows,
    ledgerFilterOptions,
    activeLedgerFilterKeySet,
    visibleLedgerRows,
    hiddenLedgerSummary,
    hasCustomLedgerFilterState,
    isShowingAllLedgerTypes,
    upgradeSectionBadges,
    featSectionBadges,
    overviewFields,
    summaryAvailabilityBadges,
    toggleLedgerFilter,
    resetLedgerFilters,
    enableAllLedgerFilters,
  }
}
