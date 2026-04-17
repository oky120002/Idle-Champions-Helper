import { FieldGroup } from '../../components/FieldGroup'
import { getLocalizedTextPair } from '../../domain/localizedText'
import { ALL_CAMPAIGNS } from './constants'
import {
  getAttackProfileLabel,
  getEnemyTypeLabel,
  getSpecialEnemyRangeLabel,
} from './variant-labels'
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

  return (
    <aside className="variants-sidebar">
      <div className="variants-sidebar__surface">
        <div className="variants-sidebar__header">
          <div className="variants-sidebar__copy">
            <span className="variants-sidebar__badge">{t({ zh: '官方基座', en: 'Official base' })}</span>
            <h3 className="variants-sidebar__title">{t({ zh: '变体筛选', en: 'Variant filters' })}</h3>
            <p className="variants-sidebar__hint">
              {t({
                zh: '左侧先缩战役 / 区域 / 场景，右侧再按战役 -> 冒险结构看阵型图、敌人构成和各个变体限制。',
                en: 'Use the left rail to narrow campaign, area, and scene first, then scan the right side in a campaign -> adventure structure with formation maps and enemy summaries.',
              })}
            </p>
          </div>
          <button type="button" className="variants-sidebar__reset" onClick={clearAllFilters}>
            {t({ zh: '清空全部', en: 'Clear all' })}
          </button>
        </div>

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
              <div className="filter-chip-grid">
                <button
                  type="button"
                  className={areaSearch.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                  onClick={() => updateAreaSearch('')}
                >
                  {t({ zh: '全部', en: 'All' })}
                </button>
                {commonObjectiveAreas.map((area) => {
                  const isActive = areaSearch === String(area)

                  return (
                    <button
                      key={area}
                      type="button"
                      className={isActive ? 'filter-chip filter-chip--active' : 'filter-chip'}
                      onClick={() => updateAreaSearch(String(area))}
                    >
                      {locale === 'zh-CN' ? `${area} 区` : `Area ${area}`}
                    </button>
                  )
                })}
              </div>
            </div>
          </FieldGroup>

          <FieldGroup
            label={t({ zh: '场景', en: 'Scene' })}
            hint={t({
              zh: '按官方冒险结构聚合后的场景标签，多选时按“或”命中。',
              en: 'Scene labels are grouped from official adventure structure; multiple picks still use OR matching.',
            })}
          >
            <div className="filter-chip-grid">
              <button
                type="button"
                className={selectedSceneIds.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                onClick={resetScenes}
              >
                {t({ zh: '全部', en: 'All' })}
              </button>
              {sceneOptions.map((scene) => {
                const isActive = selectedSceneIds.includes(scene.id)

                return (
                  <button
                    key={scene.id}
                    type="button"
                    className={isActive ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => toggleScene(scene.id)}
                  >
                    {scene.label}
                    <span className="variants-filter__count">{scene.count}</span>
                  </button>
                )
              })}
            </div>
          </FieldGroup>

          <FieldGroup
            label={t({ zh: '敌人类型', en: 'Enemy types' })}
            hint={t({
              zh: '优先保留对阵型判断更有用的类型标签，支持多选。',
              en: 'Enemy tags focus on formation-relevant categories and support multi-select.',
            })}
          >
            <div className="filter-chip-grid">
              <button
                type="button"
                className={selectedEnemyTypeIds.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
                onClick={resetEnemyTypes}
              >
                {t({ zh: '全部', en: 'All' })}
              </button>
              {enemyTypeOptions.map((enemyType) => {
                const isActive = selectedEnemyTypeIds.includes(enemyType.id)

                return (
                  <button
                    key={enemyType.id}
                    type="button"
                    className={isActive ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => toggleEnemyType(enemyType.id)}
                  >
                    {getEnemyTypeLabel(enemyType.id, locale)}
                    <span className="variants-filter__count">{enemyType.count}</span>
                  </button>
                )
              })}
            </div>
          </FieldGroup>

          <FieldGroup
            label={t({ zh: '攻击占比', en: 'Attack mix' })}
            hint={t({
              zh: '把官方怪物池归并成近战主导、远程威胁和近远混编三种节奏。',
              en: 'Official monster pools are condensed into melee-heavy, ranged-pressure, and mixed pacing buckets.',
            })}
          >
            <div className="filter-chip-grid">
              {ATTACK_PROFILE_OPTIONS.map((profile) => {
                const isActive = selectedAttackProfile === profile

                return (
                  <button
                    key={profile}
                    type="button"
                    className={isActive ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => updateAttackProfile(profile)}
                  >
                    {getAttackProfileLabel(profile, locale)}
                  </button>
                )
              })}
            </div>
          </FieldGroup>

          <FieldGroup
            label={t({ zh: '特别敌人数', en: 'Special enemy count' })}
            hint={t({
              zh: '把 Boss / 护送 / hits-based / armor-based / static 这类特殊敌人统一折算成一个密度过滤。',
              en: 'Bosses, escorts, hits-based, armor-based, and static enemies are condensed into one density filter.',
            })}
          >
            <div className="filter-chip-grid">
              {SPECIAL_ENEMY_OPTIONS.map((rangeId) => {
                const isActive = selectedSpecialEnemyRange === rangeId

                return (
                  <button
                    key={rangeId}
                    type="button"
                    className={isActive ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    onClick={() => updateSpecialEnemyRange(rangeId)}
                  >
                    {getSpecialEnemyRangeLabel(rangeId, locale)}
                  </button>
                )
              })}
            </div>
          </FieldGroup>
        </div>
      </div>
    </aside>
  )
}
