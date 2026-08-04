import { useMemo, useState } from 'react'
import { formatNumber } from './detail-value-formatters'
import type { LedgerUpgradeRow, UpgradeCategoryMeta } from './types'

type Translation = (text: { zh: string; en: string }) => string

function computeHiddenLedgerSummary(
  ledgerRowCount: number,
  hiddenLedgerLabels: string[],
  locale: 'zh-CN' | 'en-US',
  t: Translation,
): string {
  if (ledgerRowCount === 0) {
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
}

function computeHasCustomFilter(
  activeKeyCount: number,
  defaultKeys: string[],
  activeKeySet: Set<string>,
): boolean {
  return activeKeyCount !== defaultKeys.length || defaultKeys.some((key) => !activeKeySet.has(key))
}

function computeToggledSelection(
  key: string,
  signature: string,
  selection: { signature: string; keys: string[] } | null,
  defaultKeys: string[],
): { signature: string; keys: string[] } {
  const currentKeys = selection?.signature === signature ? selection.keys : defaultKeys
  return {
    signature,
    keys: currentKeys.includes(key) ? currentKeys.filter((item) => item !== key) : [...currentKeys, key],
  }
}

function allFilterKeys(
  options: Array<UpgradeCategoryMeta & { count: number }>,
  signature: string,
): { signature: string; keys: string[] } {
  return { signature, keys: options.map((option) => option.key) }
}

function useDerivedFilterData(
  ledgerRows: LedgerUpgradeRow[],
  ledgerFilterOptions: Array<UpgradeCategoryMeta & { count: number }>,
  activeLedgerFilterKeySet: Set<string>,
  locale: 'zh-CN' | 'en-US',
  t: Translation,
) {
  const visibleLedgerRows = useMemo(
    () => ledgerRows.filter((row) => activeLedgerFilterKeySet.has(row.category.key)),
    [activeLedgerFilterKeySet, ledgerRows],
  )
  const hiddenLedgerLabels = useMemo(
    () => ledgerFilterOptions.filter((option) => !activeLedgerFilterKeySet.has(option.key)).map((option) => option.label),
    [activeLedgerFilterKeySet, ledgerFilterOptions],
  )
  const hiddenLedgerSummary = useMemo(
    () => computeHiddenLedgerSummary(ledgerRows.length, hiddenLedgerLabels, locale, t),
    [hiddenLedgerLabels, ledgerRows.length, locale, t],
  )
  return { visibleLedgerRows, hiddenLedgerSummary }
}

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
    () => ledgerFilterOptions.map((option) => `${option.key}:${String(option.defaultEnabled)}:${String(option.count)}`).join('|'),
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
  const { visibleLedgerRows, hiddenLedgerSummary } = useDerivedFilterData(
    ledgerRows,
    ledgerFilterOptions,
    activeLedgerFilterKeySet,
    locale,
    t,
  )
  const hasCustomLedgerFilterState = useMemo(
    () => computeHasCustomFilter(activeLedgerFilterKeys.length, defaultLedgerFilterKeys, activeLedgerFilterKeySet),
    [activeLedgerFilterKeySet, activeLedgerFilterKeys.length, defaultLedgerFilterKeys],
  )
  const isShowingAllLedgerTypes = activeLedgerFilterKeys.length === ledgerFilterOptions.length

  function toggleLedgerFilter(key: string) {
    setLedgerFilterSelection(
      computeToggledSelection(key, ledgerFilterSignature, ledgerFilterSelection, defaultLedgerFilterKeys),
    )
  }

  return {
    activeLedgerFilterKeySet,
    visibleLedgerRows,
    hiddenLedgerSummary,
    hasCustomLedgerFilterState,
    isShowingAllLedgerTypes,
    toggleLedgerFilter,
    resetLedgerFilters: () => {
      setLedgerFilterSelection(null)
    },
    enableAllLedgerFilters: () => {
      setLedgerFilterSelection(allFilterKeys(ledgerFilterOptions, ledgerFilterSignature))
    },
  }
}
