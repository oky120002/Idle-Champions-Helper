import type { AppLocale } from '../../app/i18n'
import type { Champion } from '../../domain/types'
import { collectAttributeFilterOptions } from './options'

export interface ChampionFacetSummary {
  seatCount: number
  affiliationCount: number
  raceCount: number
  genderCount: number
  alignmentCount: number
  professionCount: number
  acquisitionCount: number
  mechanicCount: number
}

export function collectChampionFacetSummary(champions: Champion[], locale: AppLocale): ChampionFacetSummary {
  return {
    seatCount: new Set(champions.map((champion) => champion.seat)).size,
    affiliationCount: new Set(
      champions.flatMap((champion) => champion.affiliations.map((affiliation) => affiliation.original)),
    ).size,
    raceCount: collectAttributeFilterOptions(champions, 'race', locale).length,
    genderCount: collectAttributeFilterOptions(champions, 'gender', locale).length,
    alignmentCount: collectAttributeFilterOptions(champions, 'alignment', locale).length,
    professionCount: collectAttributeFilterOptions(champions, 'profession', locale).length,
    acquisitionCount: collectAttributeFilterOptions(champions, 'acquisition', locale).length,
    mechanicCount: collectAttributeFilterOptions(champions, 'mechanics', locale).length,
  }
}
