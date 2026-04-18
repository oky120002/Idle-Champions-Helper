import { FilterSidebarPanel } from '../../components/filter-sidebar/FilterSidebarPanel'
import { FieldGroup } from '../../components/FieldGroup'
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
    search,
    selectedCampaign,
    selectedSceneIds,
    selectedEnemyTypeIds,
    selectedAttackProfile,
    selectedSpecialEnemyRange,
    areaSearch,
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
    clearAllFilters,
  } = model

  if (state.status !== 'ready') {
    return null
  }

  const activeFilterCount =
    Number(search.trim().length > 0) +
    Number(selectedCampaign !== ALL_CAMPAIGNS) +
    Number(areaSearch.length > 0) +
    Number(selectedSceneIds.length > 0) +
    Number(selectedEnemyTypeIds.length > 0) +
    Number(selectedAttackProfile !== '__all__') +
    Number(selectedSpecialEnemyRange !== '__all__')
  const areaOptions = [
    {
      key: 'all',
      label: t({ zh: '全部', en: 'All' }),
      isActive: areaSearch.length === 0,
      onSelect: () => updateAreaSearch(''),
    },
    ...commonObjectiveAreas.map((area) => ({
      key: area,
      label: locale === 'zh-CN' ? `${area} 区` : `Area ${area}`,
      isActive: areaSearch === String(area),
      onSelect: () => updateAreaSearch(String(area)),
    })),
  ]
  const sceneFilterOptions = [
    {
      key: 'all',
      label: t({ zh: '全部', en: 'All' }),
      isActive: selectedSceneIds.length === 0,
      onSelect: resetScenes,
    },
    ...sceneOptions.map((scene) => ({
      key: scene.id,
      label: scene.label,
      count: scene.count,
      isActive: selectedSceneIds.includes(scene.id),
      onSelect: () => toggleScene(scene.id),
    })),
  ]
  const enemyTypeFilterOptions = [
    {
      key: 'all',
      label: t({ zh: '全部', en: 'All' }),
      isActive: selectedEnemyTypeIds.length === 0,
      onSelect: resetEnemyTypes,
    },
    ...enemyTypeOptions.map((enemyType) => ({
      key: enemyType.id,
      label: getEnemyTypeLabel(enemyType.id, locale),
      count: enemyType.count,
      isActive: selectedEnemyTypeIds.includes(enemyType.id),
      onSelect: () => toggleEnemyType(enemyType.id),
    })),
  ]
  const attackProfileOptions = ATTACK_PROFILE_OPTIONS.map((profile) => ({
    key: profile,
    label: getAttackProfileLabel(profile, locale),
    isActive: selectedAttackProfile === profile,
    onSelect: () => updateAttackProfile(profile),
  }))
  const specialEnemyOptions = SPECIAL_ENEMY_OPTIONS.map((rangeId) => ({
    key: rangeId,
    label: getSpecialEnemyRangeLabel(rangeId, locale),
    isActive: selectedSpecialEnemyRange === rangeId,
    onSelect: () => updateSpecialEnemyRange(rangeId),
  }))

  return (
    <FilterSidebarPanel
      className="variants-sidebar__surface"
      title={t({ zh: '变体筛选', en: 'Variant filters' })}
      titleAs="h3"
      description={t({
        zh: '先用战役、区域和场景缩小范围，再让敌人类型、攻击构成和特殊敌人密度辅助阵型判断。',
        en: 'Narrow by campaign, area, and scene first, then use enemy tags, attack mix, and special-enemy density to support formation decisions.',
      })}
      status={
        <>
          <span className="filter-sidebar-panel__badge">
            {activeFilterCount > 0
              ? t({ zh: `${activeFilterCount} 项已启用`, en: `${activeFilterCount} active` })
              : t({ zh: '未启用', en: 'Idle' })}
          </span>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="action-button action-button--secondary action-button--compact"
              onClick={clearAllFilters}
            >
              {t({ zh: '清空全部', en: 'Clear all' })}
            </button>
          ) : null}
        </>
      }
      statusLabel={t({ zh: '变体筛选状态操作', en: 'Variant filter status actions' })}
      note={t({
        zh: '右侧结果会继续按“战役 -> 冒险 -> 变体”展开；左侧负责定范围，右侧负责对比限制、敌人与阵型压力。',
        en: 'The right side stays grouped as campaign -> adventure -> variant. The left rail narrows scope, while the right side compares restrictions, enemies, and formation pressure.',
      })}
      ariaLabel={t({ zh: '变体筛选侧边栏', en: 'Variant filter sidebar' })}
    >
      <div className="filter-panel filter-panel--sidebar">
        <FieldGroup
          label={t({ zh: '关键词', en: 'Keyword' })}
          hint={t({
            zh: '支持搜变体名、冒险名、战役名、限制文本与敌人类型标签。',
            en: 'Search variant names, adventures, campaigns, restriction copy, and enemy-type tags.',
          })}
          as="label"
        >
          <input
            className="text-input"
            type="text"
            placeholder={t({ zh: '搜变体名、限制文本、敌人类型', en: 'Search name, restrictions, or enemy type' })}
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
          />
        </FieldGroup>

        <FieldGroup label={t({ zh: '战役', en: 'Campaign' })} as="label">
          <select
            className="text-input"
            value={selectedCampaign}
            onChange={(event) => updateSelectedCampaign(event.target.value)}
          >
            <option value={ALL_CAMPAIGNS}>{t({ zh: '全部战役', en: 'All campaigns' })}</option>
            {state.campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {getLocalizedTextPair(campaign, locale)}
              </option>
            ))}
          </select>
        </FieldGroup>

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
              value={areaSearch}
              onChange={(event) => updateAreaSearch(event.target.value.replace(/[^0-9]/g, ''))}
            />
            <VariantsFilterChipGroup options={areaOptions} />
          </div>
        </FieldGroup>

        <FieldGroup
          label={t({ zh: '场景', en: 'Scene' })}
          hint={t({
            zh: '按官方冒险结构聚合后的场景标签，多选时按“或”命中。',
            en: 'Scene labels are grouped from official adventure structure; multiple picks still use OR matching.',
          })}
        >
          <VariantsFilterChipGroup options={sceneFilterOptions} />
        </FieldGroup>

        <FieldGroup
          label={t({ zh: '敌人类型', en: 'Enemy types' })}
          hint={t({
            zh: '优先保留对阵型判断更有用的类型标签，支持多选。',
            en: 'Enemy tags focus on formation-relevant categories and support multi-select.',
          })}
        >
          <VariantsFilterChipGroup options={enemyTypeFilterOptions} />
        </FieldGroup>

        <FieldGroup
          label={t({ zh: '攻击占比', en: 'Attack mix' })}
          hint={t({
            zh: '把官方怪物池归并成近战主导、远程威胁和近远混编三种节奏。',
            en: 'Official monster pools are condensed into melee-heavy, ranged-pressure, and mixed pacing buckets.',
          })}
        >
          <VariantsFilterChipGroup options={attackProfileOptions} />
        </FieldGroup>

        <FieldGroup
          label={t({ zh: '特别敌人数', en: 'Special enemy count' })}
          hint={t({
            zh: '把 Boss / 护送 / hits-based / armor-based / static 这类特殊敌人统一折算成一个密度过滤。',
            en: 'Bosses, escorts, hits-based, armor-based, and static enemies are condensed into one density filter.',
          })}
        >
          <VariantsFilterChipGroup options={specialEnemyOptions} />
        </FieldGroup>
      </div>
    </FilterSidebarPanel>
  )
}
