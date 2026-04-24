import { FieldGroup } from '../../components/FieldGroup'
import {
  FilterSidebarSchemaRenderer,
  type FilterSidebarGroupSchema,
} from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { getLocalizedTextPair } from '../../domain/localizedText'
import { ALL_CAMPAIGNS } from './constants'
import {
  getAttackProfileLabel,
  getEnemyTypeLabel,
  getSpecialEnemyRangeLabel,
} from './variant-labels'
import { VariantsFilterChipGroup } from './VariantsFilterChipGroup'
import type { AttackProfileFilterId, SpecialEnemyFilterId, VariantsPageModel } from './types'

type VariantsFilterBarProps = {
  model: VariantsPageModel
}

const ATTACK_PROFILE_OPTIONS: AttackProfileFilterId[] = ['__all__', 'meleeHeavy', 'rangedThreat', 'mixed']
const SPECIAL_ENEMY_OPTIONS: SpecialEnemyFilterId[] = ['__all__', 'light', 'standard', 'dense']

export function VariantsFilterBar({ model }: VariantsFilterBarProps) {
  const {
    locale,
    t,
    state,
    filters,
    sceneOptions,
    enemyTypeOptions,
    commonObjectiveAreas,
    updateSearch,
    updateSelectedCampaign,
    updateAreaSearch,
    updateAttackProfile,
    updateSpecialEnemyRange,
    resetEnemyTypes,
    toggleEnemyType,
    resetScenes,
    toggleScene,
  } = model

  if (state.status !== 'ready') {
    return null
  }

  const areaOptions = [
    {
      key: 'all',
      label: t({ zh: '全部', en: 'All' }),
      isActive: filters.areaSearch.length === 0,
      onSelect: () => updateAreaSearch(''),
    },
    ...commonObjectiveAreas.map((area) => ({
      key: area,
      label: locale === 'zh-CN' ? `${area} 区` : `Area ${area}`,
      isActive: filters.areaSearch === String(area),
      onSelect: () => updateAreaSearch(String(area)),
    })),
  ]
  const groups: FilterSidebarGroupSchema[] = [
    {
      kind: 'plain',
      id: 'variant-filters',
      fields: [
        {
          kind: 'search',
          id: 'keyword',
          label: t({ zh: '关键词', en: 'Keyword' }),
          value: filters.search,
          onChange: updateSearch,
          hint: t({
            zh: '支持搜变体名、冒险名、战役名、限制文本与敌人类型标签。',
            en: 'Search variant names, adventures, campaigns, restriction copy, and enemy-type tags.',
          }),
          placeholder: t({ zh: '搜变体名、限制文本、敌人类型', en: 'Search name, restrictions, or enemy type' }),
          type: 'text',
        },
        {
          kind: 'select',
          id: 'campaign',
          label: t({ zh: '战役', en: 'Campaign' }),
          value: filters.selectedCampaign,
          onChange: updateSelectedCampaign,
          options: [
            { value: ALL_CAMPAIGNS, label: t({ zh: '全部战役', en: 'All campaigns' }) },
            ...state.campaigns.map((campaign) => ({
              value: campaign.id,
              label: getLocalizedTextPair(campaign, locale),
            })),
          ],
        },
        {
          kind: 'custom',
          id: 'area',
          render: () => (
            <FieldGroup
              label={t({ zh: '区域（Area）', en: 'Area' })}
              hint={t({
                zh: '输入区域号后，仅保留目标区间不低于该值的变体；下方保留常见区域快捷入口。',
                en: 'Enter an area number to keep variants whose target area is at least that value. Common area chips stay below for quick jumps.',
              })}
              as="label"
            >
              <div className="variants-area-filter">
                <input
                  className="text-input"
                  type="text"
                  inputMode="numeric"
                  placeholder={t({ zh: '例如 75 / 125 / 175', en: 'For example 75 / 125 / 175' })}
                  value={filters.areaSearch}
                  onChange={(event) => updateAreaSearch(event.target.value.replace(/[^0-9]/g, ''))}
                />
                <VariantsFilterChipGroup options={areaOptions} />
              </div>
            </FieldGroup>
          ),
        },
        {
          kind: 'chip-multi',
          id: 'scene',
          label: t({ zh: '场景', en: 'Scene' }),
          hint: t({
            zh: '按官方冒险结构聚合后的场景标签，多选时按“或”命中。',
            en: 'Scene labels are grouped from official adventure structure; multiple picks still use OR matching.',
          }),
          options: sceneOptions.map((scene) => ({
            id: scene.id,
            label: scene.label,
            count: scene.count,
          })),
          selectedValues: filters.selectedSceneIds,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: resetScenes,
          onToggle: (value) => toggleScene(String(value)),
        },
        {
          kind: 'chip-multi',
          id: 'enemy-types',
          label: t({ zh: '敌人类型', en: 'Enemy types' }),
          hint: t({
            zh: '优先保留对阵型判断更有用的类型标签，支持多选。',
            en: 'Enemy tags focus on formation-relevant categories and support multi-select.',
          }),
          options: enemyTypeOptions.map((enemyType) => ({
            id: enemyType.id,
            label: getEnemyTypeLabel(enemyType.id, locale),
            count: enemyType.count,
          })),
          selectedValues: filters.selectedEnemyTypeIds,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: resetEnemyTypes,
          onToggle: (value) => toggleEnemyType(String(value)),
        },
        {
          kind: 'chip-single',
          id: 'attack-profile',
          label: t({ zh: '攻击占比', en: 'Attack mix' }),
          value: filters.selectedAttackProfile,
          onChange: (value) => updateAttackProfile(value as AttackProfileFilterId),
          groupLabel: t({ zh: '攻击占比', en: 'Attack mix' }),
          hint: t({
            zh: '把官方怪物池归并成近战主导、远程威胁和近远混编三种节奏。',
            en: 'Official monster pools are condensed into melee-heavy, ranged-pressure, and mixed pacing buckets.',
          }),
          options: ATTACK_PROFILE_OPTIONS.map((profile) => ({
            value: profile,
            label: getAttackProfileLabel(profile, locale),
          })),
        },
        {
          kind: 'chip-single',
          id: 'special-enemy-range',
          label: t({ zh: '特别敌人数', en: 'Special enemy count' }),
          value: filters.selectedSpecialEnemyRange,
          onChange: (value) => updateSpecialEnemyRange(value as SpecialEnemyFilterId),
          groupLabel: t({ zh: '特别敌人数', en: 'Special enemy count' }),
          hint: t({
            zh: '把 Boss / 护送 / hits-based / armor-based / static 这类特殊敌人统一折算成一个密度过滤。',
            en: 'Bosses, escorts, hits-based, armor-based, and static enemies are condensed into one density filter.',
          }),
          options: SPECIAL_ENEMY_OPTIONS.map((rangeId) => ({
            value: rangeId,
            label: getSpecialEnemyRangeLabel(rangeId, locale),
          })),
        },
      ],
    },
  ]

  return (
    <div className="variants-workbench__sidebar">
      <FilterSidebarSchemaRenderer groups={groups} />
    </div>
  )
}
