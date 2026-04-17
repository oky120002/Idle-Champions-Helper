import { FilterDisclosureSection } from '../../components/FilterDisclosureSection'
import { getChampionAttributeGroupLabel, getChampionTagLabel } from '../../domain/championTags'
import { FilterChipFieldGroup } from '../../features/champion-filters/FilterChipFieldGroup'
import { MechanicFilterFieldGroup } from '../../features/champion-filters/MechanicFilterFieldGroup'
import type { ChampionsPageModel } from './types'

interface ChampionsAdditionalFiltersProps {
  model: ChampionsPageModel
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
    <>
      <div className="champions-sidebar__section-label champions-sidebar__section-label--subtle">
        {t({ zh: '补充筛选', en: 'Additional filters' })}
      </div>

      <div className="filter-disclosure-stack">
        <FilterDisclosureSection
          title={t({ zh: '身份画像', en: 'Identity' })}
          summary={t({ zh: '种族 / 性别 / 阵营', en: 'Race / gender / alignment' })}
          status={
            identityFiltersSelectedCount > 0
              ? t({ zh: `已选 ${identityFiltersSelectedCount}`, en: `${identityFiltersSelectedCount} selected` })
              : t({ zh: '默认收起', en: 'Folded' })
          }
          isExpanded={isIdentityFiltersExpanded}
          onToggle={() => setIdentityFiltersExpanded(!isIdentityFiltersExpanded)}
        >
          <div className="filter-panel filter-panel--nested">
            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('race', locale)}
              hint={t({ zh: '支持多选；适合快速收窄到特定种族组合。', en: 'Multi-select is supported for narrowing the pool to specific races.' })}
              options={raceOptions.map((race) => ({ id: race, label: getChampionTagLabel(race, locale) }))}
              selectedValues={selectedRaces}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={resetRace}
              onToggle={toggleRace}
            />

            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('gender', locale)}
              hint={t({ zh: '支持多选；同一维度内仍按“或”命中。', en: 'Multi-select is supported, and matches within this group still use OR.' })}
              options={genderOptions.map((gender) => ({ id: gender, label: getChampionTagLabel(gender, locale) }))}
              selectedValues={selectedGenders}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={resetGender}
              onToggle={toggleGender}
            />

            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('alignment', locale)}
              hint={t({ zh: '支持多选；适合先看善恶 / 秩序倾向的英雄池。', en: 'Multi-select is supported for comparing alignment tendencies in one pass.' })}
              options={alignmentOptions.map((alignment) => ({ id: alignment, label: getChampionTagLabel(alignment, locale) }))}
              selectedValues={selectedAlignments}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={resetAlignment}
              onToggle={toggleAlignment}
            />
          </div>
        </FilterDisclosureSection>

        <FilterDisclosureSection
          title={t({ zh: '来源与特殊机制', en: 'Source & special mechanics' })}
          summary={t({ zh: '职业 / 获取方式 / 特殊机制', en: 'Profession / availability / special mechanics' })}
          status={
            metaFiltersSelectedCount > 0
              ? t({ zh: `已选 ${metaFiltersSelectedCount}`, en: `${metaFiltersSelectedCount} selected` })
              : t({ zh: '默认收起', en: 'Folded' })
          }
          isExpanded={isMetaFiltersExpanded}
          onToggle={() => setMetaFiltersExpanded(!isMetaFiltersExpanded)}
        >
          <div className="filter-panel filter-panel--nested">
            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('profession', locale)}
              hint={t({ zh: '支持多选；便于按职业组合快速找候选英雄。', en: 'Multi-select is supported for filtering by profession combinations.' })}
              options={professionOptions.map((profession) => ({ id: profession, label: getChampionTagLabel(profession, locale) }))}
              selectedValues={selectedProfessions}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={resetProfession}
              onToggle={toggleProfession}
            />

            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('acquisition', locale)}
              hint={t({ zh: '支持多选；可以区分起始、常驻、活动或 Tales 等来源。', en: 'Multi-select is supported for comparing starter, evergreen, event, or Tales availability.' })}
              options={acquisitionOptions.map((acquisition) => ({ id: acquisition, label: getChampionTagLabel(acquisition, locale) }))}
              selectedValues={selectedAcquisitions}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={resetAcquisition}
              onToggle={toggleAcquisition}
            />

            <MechanicFilterFieldGroup
              locale={locale}
              label={getChampionAttributeGroupLabel('mechanics', locale)}
              hint={t({
                zh: '支持多选；这里只收会直接影响阵型取舍的特殊玩法标签，不等于完整技能说明。',
                en: 'Multi-select is supported for the combat tags that most directly affect formation building, not the full ability text.',
              })}
              groups={mechanicOptionGroups}
              selectedValues={selectedMechanics}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={resetMechanic}
              onToggle={toggleMechanic}
              groupHint={getMechanicCategoryHint}
            />
          </div>
        </FilterDisclosureSection>
      </div>
    </>
  )
}
