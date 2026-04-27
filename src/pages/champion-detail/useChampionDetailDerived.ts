import { useMemo } from 'react'
import type { AppLocale } from '../../app/i18n'
import type { ChampionDetail } from '../../domain/types'
import { buildEffectContext, buildAttackLabelById, buildUpgradeLabelById, buildUpgradePresentations } from './detail-derived-context'
import {
  buildAvailableFeatCount,
  buildFeatSectionBadges,
  buildLedgerFilterOptions,
  buildLedgerRows,
  buildOverviewFields,
  buildSpotlightUpgrades,
  buildSummaryAvailabilityBadges,
  buildUpgradeSectionBadges,
  buildLedgerUpgrades,
} from './detail-derived-sections'
import { buildSpecializationUpgradeColumns } from './specialization-column-model'
import { useLedgerFilterState } from './useLedgerFilterState'

interface Translation {
  (text: { zh: string; en: string }): string
}

export function useChampionDetailDerived(detail: ChampionDetail | null, locale: AppLocale, t: Translation) {
  const attackLabelById = useMemo(() => buildAttackLabelById(detail, locale), [detail, locale])
  const upgradeLabelById = useMemo(
    () => buildUpgradeLabelById(detail, locale, attackLabelById),
    [attackLabelById, detail, locale],
  )
  const effectContext = useMemo(
    () => buildEffectContext(detail, locale, attackLabelById, upgradeLabelById),
    [attackLabelById, detail, locale, upgradeLabelById],
  )
  const upgradePresentations = useMemo(
    () => buildUpgradePresentations(detail, effectContext),
    [detail, effectContext],
  )
  const spotlightUpgrades = useMemo(() => buildSpotlightUpgrades(detail), [detail])
  const specializationColumns = useMemo(
    () => buildSpecializationUpgradeColumns(detail, spotlightUpgrades, effectContext, upgradePresentations),
    [detail, effectContext, spotlightUpgrades, upgradePresentations],
  )
  const ledgerUpgrades = useMemo(() => buildLedgerUpgrades(detail), [detail])
  const ledgerRows = useMemo(
    () => buildLedgerRows(ledgerUpgrades, effectContext, locale, upgradePresentations),
    [effectContext, ledgerUpgrades, locale, upgradePresentations],
  )
  const ledgerFilterOptions = useMemo(() => buildLedgerFilterOptions(ledgerRows, locale), [ledgerRows, locale])
  const {
    activeLedgerFilterKeySet,
    visibleLedgerRows,
    hiddenLedgerSummary,
    hasCustomLedgerFilterState,
    isShowingAllLedgerTypes,
    toggleLedgerFilter,
    resetLedgerFilters,
    enableAllLedgerFilters,
  } = useLedgerFilterState({
    ledgerRows,
    ledgerFilterOptions,
    locale,
    t,
  })
  const availableFeatCount = useMemo(() => buildAvailableFeatCount(detail), [detail])
  const upgradeSectionBadges = useMemo(
    () =>
      buildUpgradeSectionBadges({
        detail,
        specializationColumns,
        locale,
        t,
      }),
    [detail, locale, specializationColumns, t],
  )
  const featSectionBadges = useMemo(
    () => buildFeatSectionBadges({ detail, availableFeatCount, locale, t }),
    [availableFeatCount, detail, locale, t],
  )
  const overviewFields = useMemo(
    () => buildOverviewFields({ detail, locale, t, effectContext }),
    [detail, effectContext, locale, t],
  )
  const summaryAvailabilityBadges = useMemo(() => buildSummaryAvailabilityBadges(detail, t), [detail, t])

  return {
    effectContext,
    upgradePresentations,
    spotlightUpgrades,
    specializationColumns,
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
