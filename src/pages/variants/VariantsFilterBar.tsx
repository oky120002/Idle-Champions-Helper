 
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
  readonly model: VariantsPageModel
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
      label: t("全部"),
      isActive: filters.areaSearch.length === 0,
      onSelect: () => updateAreaSearch(''),
    },
    ...commonObjectiveAreas.map((area) => ({
      key: area,
      label: locale === 'zh-CN' ? `${String(area)} 区` : `Area ${String(area)}`,
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
          label: t("关键词"),
          value: filters.search,
          onChange: updateSearch,
          hint: t("支持搜变体名、冒险名、战役名、限制文本与敌人类型标签。"),
          placeholder: t("搜变体名、限制文本、敌人类型"),
          type: 'text',
        },
        {
          kind: 'select',
          id: 'campaign',
          label: t("战役"),
          value: filters.selectedCampaign,
          onChange: updateSelectedCampaign,
          options: [
            { value: ALL_CAMPAIGNS, label: t("全部战役") },
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
              label={t("区域（Area）")}
              hint={t("输入区域号后，仅保留目标区间不低于该值的变体；下方保留常见区域快捷入口。")}
              as="label"
            >
              <div className="variants-area-filter">
                <input
                  className="text-input"
                  type="text"
                  inputMode="numeric"
                  placeholder={t("例如 75 / 125 / 175")}
                  value={filters.areaSearch}
                  onChange={(event) => updateAreaSearch(event.target.value.replace(/\D/g, ''))}
                />
                <VariantsFilterChipGroup options={areaOptions} />
              </div>
            </FieldGroup>
          ),
        },
        {
          kind: 'chip-multi',
          id: 'scene',
          label: t("场景"),
          hint: t("按官方冒险结构聚合后的场景标签，多选时按“或”命中。"),
          options: sceneOptions.map((scene) => ({
            id: scene.id,
            label: scene.label,
            count: scene.count,
          })),
          selectedValues: filters.selectedSceneIds,
          allLabel: t("全部"),
          onReset: resetScenes,
          onToggle: (value) => toggleScene(String(value)),
        },
        {
          kind: 'chip-multi',
          id: 'enemy-types',
          label: t("敌人类型"),
          hint: t("优先保留对阵型判断更有用的类型标签，支持多选。"),
          options: enemyTypeOptions.map((enemyType) => ({
            id: enemyType.id,
            label: getEnemyTypeLabel(enemyType.id, locale),
            count: enemyType.count,
          })),
          selectedValues: filters.selectedEnemyTypeIds,
          allLabel: t("全部"),
          onReset: resetEnemyTypes,
          onToggle: (value) => toggleEnemyType(String(value)),
        },
        {
          kind: 'chip-single',
          id: 'attack-profile',
          label: t("攻击占比"),
          value: filters.selectedAttackProfile,
          onChange: (value) => updateAttackProfile(value as AttackProfileFilterId),
          groupLabel: t("攻击占比"),
          hint: t("把官方怪物池归并成近战主导、远程威胁和近远混编三种节奏。"),
          options: ATTACK_PROFILE_OPTIONS.map((profile) => ({
            value: profile,
            label: getAttackProfileLabel(profile, locale),
          })),
        },
        {
          kind: 'chip-single',
          id: 'special-enemy-range',
          label: t("特别敌人数"),
          value: filters.selectedSpecialEnemyRange,
          onChange: (value) => updateSpecialEnemyRange(value as SpecialEnemyFilterId),
          groupLabel: t("特别敌人数"),
          hint: t("把 Boss / 护送 / hits-based / armor-based / static 这类特殊敌人统一折算成一个密度过滤。"),
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
