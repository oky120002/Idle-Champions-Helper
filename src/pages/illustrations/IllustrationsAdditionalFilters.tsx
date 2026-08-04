import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import {
  ChampionAdditionalFilterSections,
  type ChampionAdditionalFilterCopy,
} from '../../features/champion-filters/ChampionAdditionalFilterSections'
import type { IllustrationsPageModel } from './types'

type IllustrationsAdditionalFiltersProps = {
  model: IllustrationsPageModel
}

const illustrationsAdditionalFilterCopy: ChampionAdditionalFilterCopy = {
  metaTitle: { zh: '玩法标签', en: 'Gameplay tags' },
  metaSummary: { zh: '职业 / 获取方式 / 特殊机制', en: 'Profession / availability / mechanics' },
  raceHint: {
    zh: '支持多选；适合快速收窄到特定种族英雄的全部立绘。',
    en: 'Multi-select is supported for quickly narrowing down to a specific race’s artwork.',
  },
  genderHint: {
    zh: '支持多选；用英雄元数据交叉过滤皮肤池。',
    en: 'Multi-select is supported for intersecting the skin pool with champion metadata.',
  },
  alignmentHint: {
    zh: '支持多选；适合快速抽出守序、混乱或善恶阵营相关的立绘集合。',
    en: 'Multi-select is supported for gathering lawful, chaotic, or moral alignment slices.',
  },
  professionHint: {
    zh: '支持多选；适合快速看同职业英雄在立绘上的风格分布。',
    en: 'Multi-select is supported for browsing how one class spreads across the art catalog.',
  },
  acquisitionHint: {
    zh: '支持多选；区分核心、常驻、活动或 Tales 等来源时会更顺手。',
    en: 'Multi-select is supported when you want to separate core, evergreen, event, or Tales sources.',
  },
  mechanicHint: {
    zh: '这里保留会直接影响阵型取舍的玩法标签，方便看某类特化英雄的全部形象资源。',
    en: 'These are the mechanics that most directly affect formation choices, which makes them useful for slicing the art catalog too.',
  },
}

export function IllustrationsAdditionalFilters({ model }: IllustrationsAdditionalFiltersProps) {
  const { locale, t, filters, ui, options, identityFiltersSelectedCount, metaFiltersSelectedCount, actions } = model

  return (
    <ChampionAdditionalFilterSections
      locale={locale}
      t={t}
      copy={illustrationsAdditionalFilterCopy}
      values={{
        selectedRaces: filters.selectedRaces,
        selectedGenders: filters.selectedGenders,
        selectedAlignments: filters.selectedAlignments,
        selectedProfessions: filters.selectedProfessions,
        selectedAcquisitions: filters.selectedAcquisitions,
        selectedMechanics: filters.selectedMechanics,
      }}
      options={{
        raceOptions: options.raceOptions,
        genderOptions: options.genderOptions,
        alignmentOptions: options.alignmentOptions,
        professionOptions: options.professionOptions,
        acquisitionOptions: options.acquisitionOptions,
        mechanicOptionGroups: options.mechanicOptionGroups,
      }}
      ui={{
        identitySelectedCount: identityFiltersSelectedCount,
        metaSelectedCount: metaFiltersSelectedCount,
        isIdentityExpanded: ui.isIdentityFiltersExpanded,
        isMetaExpanded: ui.isMetaFiltersExpanded,
      }}
      actions={{
        toggleIdentityExpanded: actions.toggleIdentityFiltersExpanded,
        toggleMetaExpanded: actions.toggleMetaFiltersExpanded,
        resetRace: actions.resetRace,
        toggleRace: actions.toggleRace,
        resetGender: actions.resetGender,
        toggleGender: actions.toggleGender,
        resetAlignment: actions.resetAlignment,
        toggleAlignment: actions.toggleAlignment,
        resetProfession: actions.resetProfession,
        toggleProfession: actions.toggleProfession,
        resetAcquisition: actions.resetAcquisition,
        toggleAcquisition: actions.toggleAcquisition,
        resetMechanic: actions.resetMechanic,
        toggleMechanic: actions.toggleMechanic,
      }}
      mechanicGroupHint={(groupId) => getMechanicCategoryHint(groupId, t)}
    />
  )
}
