import {
  FilterSidebarSchemaRenderer,
  type FilterSidebarGroupSchema,
} from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { MechanicFilterFieldGroup } from '../../features/champion-filters/MechanicFilterFieldGroup'
import { getMechanicCategoryHint } from '../../features/champion-filters/mechanicHints'
import { getChampionAttributeGroupLabel, getChampionTagLabel } from '../../domain/championTags'
import type { IllustrationsPageModel } from './types'

type IllustrationsAdditionalFiltersProps = {
  model: IllustrationsPageModel
}

export function IllustrationsAdditionalFilters({ model }: IllustrationsAdditionalFiltersProps) {
  const { locale, t, filters, ui, options, identityFiltersSelectedCount, metaFiltersSelectedCount, actions } = model
  const groups: FilterSidebarGroupSchema[] = [
    {
      kind: 'disclosure-group',
      id: 'additional',
      label: t({ zh: '补充筛选', en: 'Additional filters' }),
      sections: [
        {
          id: 'identity',
          title: t({ zh: '身份画像', en: 'Identity' }),
          summary: t({ zh: '种族 / 性别 / 阵营', en: 'Race / gender / alignment' }),
          status: identityFiltersSelectedCount > 0
            ? t({ zh: `已选 ${identityFiltersSelectedCount}`, en: `${identityFiltersSelectedCount} selected` })
            : t({ zh: '默认收起', en: 'Folded' }),
          isExpanded: ui.isIdentityFiltersExpanded,
          onToggle: actions.toggleIdentityFiltersExpanded,
          fields: [
            {
              kind: 'chip-multi',
              id: 'races',
              label: getChampionAttributeGroupLabel('race', locale),
              hint: t({
                zh: '支持多选；适合快速收窄到特定种族英雄的全部立绘。',
                en: 'Multi-select is supported for quickly narrowing down to a specific race’s artwork.',
              }),
              options: options.raceOptions.map((race) => ({
                id: race,
                label: getChampionTagLabel(race, locale),
              })),
              selectedValues: filters.selectedRaces,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetRace,
              onToggle: (value) => actions.toggleRace(String(value)),
            },
            {
              kind: 'chip-multi',
              id: 'genders',
              label: getChampionAttributeGroupLabel('gender', locale),
              hint: t({
                zh: '支持多选；用英雄元数据交叉过滤皮肤池。',
                en: 'Multi-select is supported for intersecting the skin pool with champion metadata.',
              }),
              options: options.genderOptions.map((gender) => ({
                id: gender,
                label: getChampionTagLabel(gender, locale),
              })),
              selectedValues: filters.selectedGenders,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetGender,
              onToggle: (value) => actions.toggleGender(String(value)),
            },
            {
              kind: 'chip-multi',
              id: 'alignments',
              label: getChampionAttributeGroupLabel('alignment', locale),
              hint: t({
                zh: '支持多选；适合快速抽出守序、混乱或善恶阵营相关的立绘集合。',
                en: 'Multi-select is supported for gathering lawful, chaotic, or moral alignment slices.',
              }),
              options: options.alignmentOptions.map((alignment) => ({
                id: alignment,
                label: getChampionTagLabel(alignment, locale),
              })),
              selectedValues: filters.selectedAlignments,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetAlignment,
              onToggle: (value) => actions.toggleAlignment(String(value)),
            },
          ],
        },
        {
          id: 'meta',
          title: t({ zh: '玩法标签', en: 'Gameplay tags' }),
          summary: t({ zh: '职业 / 获取方式 / 特殊机制', en: 'Profession / availability / mechanics' }),
          status: metaFiltersSelectedCount > 0
            ? t({ zh: `已选 ${metaFiltersSelectedCount}`, en: `${metaFiltersSelectedCount} selected` })
            : t({ zh: '默认收起', en: 'Folded' }),
          isExpanded: ui.isMetaFiltersExpanded,
          onToggle: actions.toggleMetaFiltersExpanded,
          fields: [
            {
              kind: 'chip-multi',
              id: 'professions',
              label: getChampionAttributeGroupLabel('profession', locale),
              hint: t({
                zh: '支持多选；适合快速看同职业英雄在立绘上的风格分布。',
                en: 'Multi-select is supported for browsing how one class spreads across the art catalog.',
              }),
              options: options.professionOptions.map((profession) => ({
                id: profession,
                label: getChampionTagLabel(profession, locale),
              })),
              selectedValues: filters.selectedProfessions,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetProfession,
              onToggle: (value) => actions.toggleProfession(String(value)),
            },
            {
              kind: 'chip-multi',
              id: 'acquisitions',
              label: getChampionAttributeGroupLabel('acquisition', locale),
              hint: t({
                zh: '支持多选；区分核心、常驻、活动或 Tales 等来源时会更顺手。',
                en: 'Multi-select is supported when you want to separate core, evergreen, event, or Tales sources.',
              }),
              options: options.acquisitionOptions.map((acquisition) => ({
                id: acquisition,
                label: getChampionTagLabel(acquisition, locale),
              })),
              selectedValues: filters.selectedAcquisitions,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetAcquisition,
              onToggle: (value) => actions.toggleAcquisition(String(value)),
            },
            {
              kind: 'custom',
              id: 'mechanics',
              render: () => (
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
              ),
            },
          ],
        },
      ],
    },
  ]

  return <FilterSidebarSchemaRenderer groups={groups} />
}
