import { useMemo, useState } from 'react'
import { formatNumber } from './shared'
import type { LedgerUpgradeRow, UpgradeCategoryMeta } from './types'

type UseLedgerFilterStateOptions = {
  ledgerRows: LedgerUpgradeRow[]
  ledgerFilterOptions: Array<UpgradeCategoryMeta & { count: number }>
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
}

export function useLedgerFilterState({ ledgerRows, ledgerFilterOptions, locale, t }: UseLedgerFilterStateOptions) {
  const defaultLedgerFilterKeys = useMemo(
    () => ledgerFilterOptions.filter((option) => option.defaultEnabled).map((option) => option.key),
    [ledgerFilterOptions],
  )
  const ledgerFilterSignature = useMemo(
    () => ledgerFilterOptions.map((option) => `${option.key}:${option.defaultEnabled}:${option.count}`).join('|'),
    [ledgerFilterOptions],
  )
  const [ledgerFilterSelection, setLedgerFilterSelection] = useState<{ signature: string; keys: string[] } | null>(null)
  const activeLedgerFilterKeys = useMemo(
    () =>
      ledgerFilterSelection?.signature === ledgerFilterSignature
        ? ledgerFilterSelection.keys
        : defaultLedgerFilterKeys,
    [defaultLedgerFilterKeys, ledgerFilterSelection, ledgerFilterSignature],
  )
  const activeLedgerFilterKeySet = useMemo(() => new Set(activeLedgerFilterKeys), [activeLedgerFilterKeys])
  const visibleLedgerRows = useMemo(
    () => ledgerRows.filter((row) => activeLedgerFilterKeySet.has(row.category.key)),
    [activeLedgerFilterKeySet, ledgerRows],
  )
  const hiddenLedgerLabels = useMemo(
    () => ledgerFilterOptions.filter((option) => !activeLedgerFilterKeySet.has(option.key)).map((option) => option.label),
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

  function toggleLedgerFilter(key: string) {
    const currentKeys =
      ledgerFilterSelection?.signature === ledgerFilterSignature
        ? ledgerFilterSelection.keys
        : defaultLedgerFilterKeys

    setLedgerFilterSelection({
      signature: ledgerFilterSignature,
      keys: currentKeys.includes(key) ? currentKeys.filter((item) => item !== key) : [...currentKeys, key],
    })
  }

  return {
    activeLedgerFilterKeySet,
    visibleLedgerRows,
    hiddenLedgerSummary,
    hasCustomLedgerFilterState,
    isShowingAllLedgerTypes,
    toggleLedgerFilter,
    resetLedgerFilters: () => setLedgerFilterSelection(null),
    enableAllLedgerFilters: () =>
      setLedgerFilterSelection({
        signature: ledgerFilterSignature,
        keys: ledgerFilterOptions.map((option) => option.key),
      }),
  }
}
