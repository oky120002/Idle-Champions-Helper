/* eslint-disable max-lines -- 内聚的场景选择组件，拆分会降低常见任务一跳命中率 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Variant } from '../../domain/types'
import { PlannerScenarioDetail } from './PlannerScenarioDetail'
import { PlannerScenarioListItem } from './PlannerScenarioListItem'
import {
  DEFAULT_VISIBLE_RESULTS,
  type PlannerScenarioRecord,
  buildCampaignOptions,
  getQueryTokens,
  getScenarioSortWeight,
  normalizeSearchText,
} from './plannerScenarioModel'

interface PlannerScenarioSelectionProps {
  readonly variants: Variant[]
  readonly selectedId?: string | null
  readonly onSelectedIdChange?: (variantId: string | null) => void
}

export function PlannerScenarioSelection({
  variants,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
}: PlannerScenarioSelectionProps) {
  const { locale, t } = useI18n()
  const [search, setSearch] = useState('')
  const [showAllResults, setShowAllResults] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string>('all')
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState<string | null>(null)
  const selectedId = controlledSelectedId === undefined ? uncontrolledSelectedId : controlledSelectedId

  const updateSelectedId = useCallback((nextSelectedId: string | null) => {
    if (controlledSelectedId === undefined) {
      setUncontrolledSelectedId(nextSelectedId)
    }
    onSelectedIdChange?.(nextSelectedId)
  }, [controlledSelectedId, onSelectedIdChange])

  const records = useMemo<PlannerScenarioRecord[]>(
    () =>
      variants.map((variant) => {
        const name = getPrimaryLocalizedText(variant.name, locale)
        const campaign = getPrimaryLocalizedText(variant.campaign, locale)
        const adventure = variant.adventure ? getPrimaryLocalizedText(variant.adventure, locale) : ''
        const scene = variant.scene ? getPrimaryLocalizedText(variant.scene, locale) : ''
        const restrictions = variant.restrictions.map((restriction) => getPrimaryLocalizedText(restriction, locale))
        const rewards = variant.rewards.map((reward) => getPrimaryLocalizedText(reward, locale))
        const mechanics = variant.mechanics

        return {
          id: variant.id,
          campaignId: variant.campaign.id,
          objectiveArea: variant.objectiveArea,
          enemyCount: variant.enemyCount,
          searchText: normalizeSearchText([
            name,
            campaign,
            adventure,
            scene,
            variant.objectiveArea ?? '',
            restrictions.join(' '),
            rewards.join(' '),
            mechanics.join(' '),
          ].join(' ')),
          name,
          campaign,
          adventure,
          scene,
          restrictions,
          rewards,
          mechanics,
        }
      }),
    [locale, variants],
  )
  const queryTokens = useMemo(() => getQueryTokens(search), [search])
  const campaignOptions = useMemo(() => buildCampaignOptions(records, locale, t), [locale, records, t])
  const filteredRecords = useMemo(() => {
    const base = records.filter((record) => (
      (activeCampaignId === 'all' || record.campaignId === activeCampaignId)
      && queryTokens.every((token) => record.searchText.includes(token))
    ))

    return [...base].sort((left, right) => {
      const weightDiff = getScenarioSortWeight(left, selectedId) - getScenarioSortWeight(right, selectedId)
      if (weightDiff !== 0 && !Number.isNaN(weightDiff)) return weightDiff

      const campaignDiff = left.campaign.localeCompare(right.campaign, locale)
      if (campaignDiff !== 0 && !Number.isNaN(campaignDiff)) return campaignDiff

      const areaDiff = (left.objectiveArea ?? Number.MAX_SAFE_INTEGER) - (right.objectiveArea ?? Number.MAX_SAFE_INTEGER)
      if (areaDiff !== 0 && !Number.isNaN(areaDiff)) return areaDiff

      return left.name.localeCompare(right.name, locale)
    })
  }, [activeCampaignId, locale, queryTokens, records, selectedId])
  const visibleRecords = showAllResults ? filteredRecords : filteredRecords.slice(0, DEFAULT_VISIBLE_RESULTS)
  const selectedRecord = selectedId != null && selectedId !== ''
    ? records.find((record) => record.id === selectedId) ?? null
    : null
  const hiddenResultCount = Math.max(filteredRecords.length - visibleRecords.length, 0)

  useEffect(() => {
    if (filteredRecords.length === 0 || !onSelectedIdChange) {
      return
    }

    const selectedStillVisible = selectedId !== null && filteredRecords.some((record) => record.id === selectedId)
    if (!selectedStillVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 受控选择在列表变化后需同步回退，行为被测试覆盖
      updateSelectedId(filteredRecords[0]?.id ?? null)
    }
  }, [filteredRecords, onSelectedIdChange, selectedId, updateSelectedId])

  let summaryText: string
  if (filteredRecords.length === 0) {
    summaryText = t({ zh: '当前没有匹配场景。换个关键词，或切回其他战役。', en: 'No scenarios match. Change the query or switch campaigns.' })
  } else if (hiddenResultCount > 0) {
    summaryText = t({
      zh: `当前先显示 ${String(visibleRecords.length)} / ${String(filteredRecords.length)} 项；继续输入关键词或展开全部匹配项。`,
      en: `Showing ${String(visibleRecords.length)} of ${String(filteredRecords.length)}. Keep typing or expand the full result set.`,
    })
  } else {
    summaryText = t({
      zh: `当前展示 ${String(visibleRecords.length)} 项，可直接选择并查看右侧详情。`,
      en: `Showing ${String(visibleRecords.length)} scenarios. Select one to inspect its details.`,
    })
  }

  return (
    <div className="planner-scenario-selection">
      <header className="planner-scenario-selection__header">
        <div className="planner-scenario-selection__header-copy">
          <p className="planner-scenario-selection__eyebrow">
            {t({ zh: '场景池', en: 'Scenario pool' })}
          </p>
          <h3 className="planner-scenario-selection__title">
            {t({ zh: '先缩小范围，再确认目标关卡', en: 'Narrow the pool before locking a target scenario' })}
          </h3>
          <p className="planner-scenario-selection__description">
            {t({
              zh: '优先用战役和关键词缩小范围，只保留你当前真正在比较的目标。',
              en: 'Use campaigns and keywords to narrow the pool before comparing the scenarios that matter.',
            })}
          </p>
        </div>

        <div className="planner-scenario-selection__metrics" aria-label={t({ zh: '场景统计', en: 'Scenario statistics' })}>
          <div className="planner-scenario-selection__metric">
            <span className="planner-scenario-selection__metric-label">{t({ zh: '总场景', en: 'Total' })}</span>
            <strong className="planner-scenario-selection__metric-value">{records.length}</strong>
          </div>
          <div className="planner-scenario-selection__metric">
            <span className="planner-scenario-selection__metric-label">{t({ zh: '当前匹配', en: 'Matched' })}</span>
            <strong className="planner-scenario-selection__metric-value">{filteredRecords.length}</strong>
          </div>
          <div className="planner-scenario-selection__metric">
            <span className="planner-scenario-selection__metric-label">{t({ zh: '当前选中', en: 'Selected' })}</span>
            <strong className="planner-scenario-selection__metric-value">
              {selectedRecord?.objectiveArea ?? '—'}
            </strong>
          </div>
        </div>
      </header>

      <div className="planner-scenario-selection__tools">
        <div className="planner-scenario-selection__search">
          <label className="field-label" htmlFor="planner-scenario-search">
            {t({ zh: '搜索场景', en: 'Search scenarios' })}
          </label>
          <div className="planner-scenario-selection__search-row">
            <input
              id="planner-scenario-search"
              className="text-input"
              type="search"
              role="searchbox"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setShowAllResults(false)
              }}
              placeholder={t({
                zh: '支持战役、关卡名、目标区、限制条件组合搜索',
                en: 'Search by campaign, scenario, objective area, or restrictions',
              })}
            />
            {search !== '' ? (
              <button
                type="button"
                className="action-button action-button--ghost action-button--compact"
                onClick={() => {
                  setSearch('')
                  setShowAllResults(false)
                }}
              >
                {t({ zh: '清除', en: 'Clear' })}
              </button>
            ) : null}
          </div>
        </div>

        <div className="planner-scenario-selection__campaigns" role="group" aria-label={t({ zh: '战役过滤器', en: 'Campaign filters' })}>
          {campaignOptions.map((campaign) => {
            const isActive = campaign.id === activeCampaignId

            return (
              <button
                key={campaign.id}
                type="button"
                className={`segmented-control__button planner-scenario-selection__campaign-chip${isActive ? ' segmented-control__button--active' : ''}`}
                aria-pressed={isActive}
                onClick={() => {
                  setActiveCampaignId(campaign.id)
                  setShowAllResults(false)
                }}
              >
                <span>{campaign.label}</span>
                <span className="planner-scenario-selection__campaign-count">{campaign.count}</span>
              </button>
            )
          })}
        </div>

        <p className="planner-scenario-selection__summary" aria-live="polite">
          {summaryText}
        </p>
      </div>

      <div className="planner-scenario-selection__workspace">
        <div className="planner-scenario-selection__catalog">
          <ul
            className="planner-scenario-selection__list"
            role="listbox"
            aria-label={t({ zh: '场景列表', en: 'Scenario list' })}
          >
            {visibleRecords.map((record) => (
              <PlannerScenarioListItem
                key={record.id}
                record={record}
                isSelected={record.id === selectedId}
                onSelect={updateSelectedId}
              />
            ))}
          </ul>

          {filteredRecords.length === 0 ? (
            <div className="planner-scenario-selection__empty" role="status">
              <strong>{t({ zh: '没有匹配项', en: 'No matches' })}</strong>
              <p>{t({ zh: '试试战役名、目标区、限制条件或奖励关键词。', en: 'Try campaign names, objective areas, restrictions, or reward terms.' })}</p>
            </div>
          ) : null}

          {hiddenResultCount > 0 ? (
            <button
              type="button"
              className="action-button action-button--secondary planner-scenario-selection__toggle"
              onClick={() => setShowAllResults(true)}
            >
              {t({ zh: '展开全部匹配项', en: 'Show all matches' })}
            </button>
          ) : null}

          {showAllResults && filteredRecords.length > DEFAULT_VISIBLE_RESULTS ? (
            <button
              type="button"
              className="action-button action-button--ghost planner-scenario-selection__toggle"
              onClick={() => setShowAllResults(false)}
            >
              {t({ zh: '收起到精简视图', en: 'Collapse to compact view' })}
            </button>
          ) : null}
        </div>

        <PlannerScenarioDetail record={selectedRecord} />
      </div>
    </div>
  )
}
