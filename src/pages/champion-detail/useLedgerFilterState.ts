import { useMemo, useState } from 'react'
import { formatNumber } from './detail-value-formatters'
import type { LedgerUpgradeRow, UpgradeCategoryMeta } from './types'

type UseLedgerFilterStateOptions = {
  ledgerRows: LedgerUpgradeRow[]
  ledgerFilterOptions: Array<UpgradeCategoryMeta & { count: number }>
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
}

type Locale = 'zh-CN' | 'en-US'
type TranslateFn = (text: { zh: string; en: string }) => string

function buildHiddenLedgerSummary(
  hiddenLabels: string[],
  ledgerRowCount: number,
  locale: Locale,
  t: TranslateFn,
): string {
  if (ledgerRowCount === 0) {
    return t({ zh: '当前没有可读的数值里程碑。', en: 'No numeric milestones are available here.' })
  }

  if (hiddenLabels.length === 0) {
    return t({ zh: '当前显示全部类型', en: 'Showing every type' })
  }

  if (hiddenLabels.length <= 2) {
    return locale === 'zh-CN'
      ? `已收起 ${hiddenLabels.join(' / ')}`
      : `Hidden: ${hiddenLabels.join(' / ')}`
  }

  return locale === 'zh-CN'
    ? `已收起 ${formatNumber(hiddenLabels.length, locale)} 类`
    : `${formatNumber(hiddenLabels.length, locale)} types hidden`
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
  const hiddenLedgerSummary = useMemo(
    () => buildHiddenLedgerSummary(hiddenLedgerLabels, ledgerRows.length, locale, t),
    [hiddenLedgerLabels, ledgerRows.length, locale, t],
  )
  const hasCustomLedgerFilterState = hasCustomFilter(activeLedgerFilterKeys, defaultLedgerFilterKeys, activeLedgerFilterKeySet)
  const isShowingAllLedgerTypes = activeLedgerFilterKeys.length === ledgerFilterOptions.length

  return {
    activeLedgerFilterKeySet,
    visibleLedgerRows,
    hiddenLedgerSummary,
    hasCustomLedgerFilterState,
    isShowingAllLedgerTypes,
    toggleLedgerFilter: (key: string) => {
      toggleFilterKey(key, ledgerFilterSelection, ledgerFilterSignature, defaultLedgerFilterKeys, setLedgerFilterSelection)
    },
    resetLedgerFilters: () => { setLedgerFilterSelection(null) },
    enableAllLedgerFilters: () => {
      setLedgerFilterSelection({
        signature: ledgerFilterSignature,
        keys: ledgerFilterOptions.map((option) => option.key),
      })
    },
  }
}

function hasCustomFilter(activeKeys: string[], defaultKeys: string[], activeKeySet: Set<string>): boolean {
  if (activeKeys.length !== defaultKeys.length) return true
  return defaultKeys.some((key) => !activeKeySet.has(key))
}

function toggleFilterKey(
  key: string,
  selection: { signature: string; keys: string[] } | null,
  signature: string,
  defaultKeys: string[],
  setSelection: (next: { signature: string; keys: string[] }) => void,
) {
  const currentKeys = selection?.signature === signature ? selection.keys : defaultKeys
  setSelection({
    signature,
    keys: currentKeys.includes(key) ? currentKeys.filter((item) => item !== key) : [...currentKeys, key],
  })
}
