import { FilterDisclosureSection } from '../../components/FilterDisclosureSection'
import { MechanicFilterFieldGroup } from '../../features/champion-filters/MechanicFilterFieldGroup'
import { FilterChipFieldGroup } from '../../features/champion-filters/FilterChipFieldGroup'
import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import { getChampionAttributeGroupLabel, getChampionTagLabel } from '../../domain/championTags'
import type { IllustrationsPageModel } from './types'

type IllustrationsAdditionalFiltersProps = {
  model: IllustrationsPageModel
}

export function IllustrationsAdditionalFilters({ model }: IllustrationsAdditionalFiltersProps) {
  const { locale, t, filters, ui, options, identityFiltersSelectedCount, metaFiltersSelectedCount, actions } = model

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
          isExpanded={ui.isIdentityFiltersExpanded}
          onToggle={actions.toggleIdentityFiltersExpanded}
        >
          <div className="filter-panel filter-panel--nested">
            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('race', locale)}
              hint={t({
                zh: '支持多选；适合快速收窄到特定种族英雄的全部立绘。',
                en: 'Multi-select is supported for quickly narrowing down to a specific race’s artwork.',
              })}
              options={options.raceOptions.map((race) => ({
                id: race,
                label: getChampionTagLabel(race, locale),
              }))}
              selectedValues={filters.selectedRaces}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={actions.resetRace}
              onToggle={actions.toggleRace}
            />

            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('gender', locale)}
              hint={t({
                zh: '支持多选；用英雄元数据交叉过滤皮肤池。',
                en: 'Multi-select is supported for intersecting the skin pool with champion metadata.',
              })}
              options={options.genderOptions.map((gender) => ({
                id: gender,
                label: getChampionTagLabel(gender, locale),
              }))}
              selectedValues={filters.selectedGenders}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={actions.resetGender}
              onToggle={actions.toggleGender}
            />

            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('alignment', locale)}
              hint={t({
                zh: '支持多选；适合快速抽出守序、混乱或善恶阵营相关的立绘集合。',
                en: 'Multi-select is supported for gathering lawful, chaotic, or moral alignment slices.',
              })}
              options={options.alignmentOptions.map((alignment) => ({
                id: alignment,
                label: getChampionTagLabel(alignment, locale),
              }))}
              selectedValues={filters.selectedAlignments}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={actions.resetAlignment}
              onToggle={actions.toggleAlignment}
            />
          </div>
        </FilterDisclosureSection>

        <FilterDisclosureSection
          title={t({ zh: '玩法标签', en: 'Gameplay tags' })}
          summary={t({ zh: '职业 / 获取方式 / 特殊机制', en: 'Profession / availability / mechanics' })}
          status={
            metaFiltersSelectedCount > 0
              ? t({ zh: `已选 ${metaFiltersSelectedCount}`, en: `${metaFiltersSelectedCount} selected` })
              : t({ zh: '默认收起', en: 'Folded' })
          }
          isExpanded={ui.isMetaFiltersExpanded}
          onToggle={actions.toggleMetaFiltersExpanded}
        >
          <div className="filter-panel filter-panel--nested">
            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('profession', locale)}
              hint={t({
                zh: '支持多选；适合快速看同职业英雄在立绘上的风格分布。',
                en: 'Multi-select is supported for browsing how one class spreads across the art catalog.',
              })}
              options={options.professionOptions.map((profession) => ({
                id: profession,
                label: getChampionTagLabel(profession, locale),
              }))}
              selectedValues={filters.selectedProfessions}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={actions.resetProfession}
              onToggle={actions.toggleProfession}
            />

            <FilterChipFieldGroup
              label={getChampionAttributeGroupLabel('acquisition', locale)}
              hint={t({
                zh: '支持多选；区分核心、常驻、活动或 Tales 等来源时会更顺手。',
                en: 'Multi-select is supported when you want to separate core, evergreen, event, or Tales sources.',
              })}
              options={options.acquisitionOptions.map((acquisition) => ({
                id: acquisition,
                label: getChampionTagLabel(acquisition, locale),
              }))}
              selectedValues={filters.selectedAcquisitions}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={actions.resetAcquisition}
              onToggle={actions.toggleAcquisition}
            />

            <MechanicFilterFieldGroup
              locale={locale}
              label={getChampionAttributeGroupLabel('mechanics', locale)}
              hint={t({
                zh: '这里保留会直接影响阵型取舍的玩法标签，方便看某类特化英雄的全部形象资源。',
                en: 'These are the mechanics that most directly affect formation choices, which makes them useful for slicing the art catalog too.',
              })}
              groups={options.mechanicOptionGroups}
              selectedValues={filters.selectedMechanics}
              allLabel={t({ zh: '全部', en: 'All' })}
              onReset={actions.resetMechanic}
              onToggle={actions.toggleMechanic}
              groupHint={(groupId) => getMechanicCategoryHint(groupId, t)}
            />
          </div>
        </FilterDisclosureSection>
      </div>
    </>
  )
}
