import {
  ChampionAdditionalFilterSections,
  type ChampionAdditionalFilterCopy,
} from '../../features/champion-filters/ChampionAdditionalFilterSections'
import type { ChampionsPageModel } from './types'

interface ChampionsAdditionalFiltersProps {
  readonly model: ChampionsPageModel
}

const championsAdditionalFilterCopy: ChampionAdditionalFilterCopy = {
  metaTitle: { key: '来源与特殊机制' },
  metaSummary: { key: '职业 / 获取方式 / 特殊机制' },
  raceHint: { key: '支持多选；适合快速收窄到特定种族组合。' },
  genderHint: { key: '支持多选；同一维度内仍按“或”命中。' },
  alignmentHint: { key: '支持多选；适合先看善恶 / 秩序倾向的英雄池。' },
  professionHint: { key: '支持多选；便于按职业组合快速找候选英雄。' },
  acquisitionHint: { key: '支持多选；可以区分起始、常驻、活动或 Tales 等来源。' },
  mechanicHint: { key: '支持多选；这里只收会直接影响阵型取舍的特殊玩法标签，不等于完整技能说明。' },
}

export function ChampionsAdditionalFilters({ model }: ChampionsAdditionalFiltersProps) {
  const {
    locale,
    t,
    raceOptions,
    genderOptions,
    alignmentOptions,
    professionOptions,
    acquisitionOptions,
    mechanicOptionGroups,
    selectedRaces,
    selectedGenders,
    selectedAlignments,
    selectedProfessions,
    selectedAcquisitions,
    selectedMechanics,
    identityFiltersSelectedCount,
    metaFiltersSelectedCount,
    isIdentityFiltersExpanded,
    isMetaFiltersExpanded,
    setIdentityFiltersExpanded,
    setMetaFiltersExpanded,
    resetRace,
    toggleRace,
    resetGender,
    toggleGender,
    resetAlignment,
    toggleAlignment,
    resetProfession,
    toggleProfession,
    resetAcquisition,
    toggleAcquisition,
    resetMechanic,
    toggleMechanic,
    getMechanicCategoryHint,
  } = model

  return (
    <ChampionAdditionalFilterSections
      locale={locale}
      t={t}
      copy={championsAdditionalFilterCopy}
      values={{
        selectedRaces,
        selectedGenders,
        selectedAlignments,
        selectedProfessions,
        selectedAcquisitions,
        selectedMechanics,
      }}
      options={{
        raceOptions,
        genderOptions,
        alignmentOptions,
        professionOptions,
        acquisitionOptions,
        mechanicOptionGroups,
      }}
      ui={{
        identitySelectedCount: identityFiltersSelectedCount,
        metaSelectedCount: metaFiltersSelectedCount,
        isIdentityExpanded: isIdentityFiltersExpanded,
        isMetaExpanded: isMetaFiltersExpanded,
      }}
      actions={{
        toggleIdentityExpanded: () => setIdentityFiltersExpanded(!isIdentityFiltersExpanded),
        toggleMetaExpanded: () => setMetaFiltersExpanded(!isMetaFiltersExpanded),
        resetRace,
        toggleRace,
        resetGender,
        toggleGender,
        resetAlignment,
        toggleAlignment,
        resetProfession,
        toggleProfession,
        resetAcquisition,
        toggleAcquisition,
        resetMechanic,
        toggleMechanic,
      }}
      mechanicGroupHint={getMechanicCategoryHint}
    />
  )
}
