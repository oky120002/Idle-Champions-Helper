import {
  ChampionAdditionalFilterSections,
  type ChampionAdditionalFilterCopy,
} from '../../features/champion-filters/ChampionAdditionalFilterSections'
import type { ChampionsPageModel } from './types'

interface ChampionsAdditionalFiltersProps {
  model: ChampionsPageModel
}

const championsAdditionalFilterCopy: ChampionAdditionalFilterCopy = {
  metaTitle: { zh: '来源与特殊机制', en: 'Source & special mechanics' },
  metaSummary: { zh: '职业 / 获取方式 / 特殊机制', en: 'Profession / availability / special mechanics' },
  raceHint: {
    zh: '支持多选；适合快速收窄到特定种族组合。',
    en: 'Multi-select is supported for narrowing the pool to specific races.',
  },
  genderHint: {
    zh: '支持多选；同一维度内仍按“或”命中。',
    en: 'Multi-select is supported, and matches within this group still use OR.',
  },
  alignmentHint: {
    zh: '支持多选；适合先看善恶 / 秩序倾向的英雄池。',
    en: 'Multi-select is supported for comparing alignment tendencies in one pass.',
  },
  professionHint: {
    zh: '支持多选；便于按职业组合快速找候选英雄。',
    en: 'Multi-select is supported for filtering by profession combinations.',
  },
  acquisitionHint: {
    zh: '支持多选；可以区分起始、常驻、活动或 Tales 等来源。',
    en: 'Multi-select is supported for comparing starter, evergreen, event, or Tales availability.',
  },
  mechanicHint: {
    zh: '支持多选；这里只收会直接影响阵型取舍的特殊玩法标签，不等于完整技能说明。',
    en: 'Multi-select is supported for the combat tags that most directly affect formation building, not the full ability text.',
  },
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
