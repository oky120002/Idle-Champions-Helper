import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Variant } from '../../domain/types'

interface PlannerScenarioSelectionProps {
  variants: Variant[]
  selectedId?: string | null
  onSelectedIdChange?: (variantId: string | null) => void
}

interface PlannerScenarioRecord {
  id: string
  name: string
  campaignId: string
  campaign: string
  adventure: string
  scene: string
  objectiveArea: number | null
  restrictions: string[]
  rewards: string[]
  mechanics: string[]
  enemyCount: number
  searchText: string
}

const DEFAULT_VISIBLE_RESULTS = 12

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function getQueryTokens(value: string): string[] {
  return normalizeSearchText(value)
    .split(/\s+/u)
    .filter(Boolean)
}

function getScenarioSortWeight(record: PlannerScenarioRecord, selectedId: string | null): number {
  return record.id === selectedId ? -1 : 0
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
          name,
          campaignId: variant.campaign.id,
          campaign,
          adventure,
          scene,
          objectiveArea: variant.objectiveArea,
          restrictions,
          rewards,
          mechanics,
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
        }
      }),
    [locale, variants],
  )
  const queryTokens = useMemo(() => getQueryTokens(search), [search])
  const campaignOptions = useMemo(() => {
    const counts = new Map<string, { id: string, label: string, count: number }>()

    for (const record of records) {
      const existing = counts.get(record.campaignId)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(record.campaignId, {
          id: record.campaignId,
          label: record.campaign,
          count: 1,
        })
      }
    }

    return [
      {
        id: 'all' as const,
        label: t({ zh: '全部战役', en: 'All campaigns' }),
        count: records.length,
      },
      ...[...counts.values()].sort((left, right) => left.label.localeCompare(right.label, locale)),
    ]
  }, [locale, records, t])
  const filteredRecords = useMemo(() => {
    const base = records.filter((record) => (
      (activeCampaignId === 'all' || record.campaignId === activeCampaignId)
      && queryTokens.every((token) => record.searchText.includes(token))
    ))

    return [...base].sort((left, right) => (
      getScenarioSortWeight(left, selectedId) - getScenarioSortWeight(right, selectedId)
      || left.campaign.localeCompare(right.campaign, locale)
      || (left.objectiveArea ?? Number.MAX_SAFE_INTEGER) - (right.objectiveArea ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name, locale)
    ))
  }, [activeCampaignId, locale, queryTokens, records, selectedId])
  const visibleRecords = showAllResults ? filteredRecords : filteredRecords.slice(0, DEFAULT_VISIBLE_RESULTS)
  const selectedRecord = selectedId
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
            {search ? (
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
          {filteredRecords.length === 0
            ? t({ zh: '当前没有匹配场景。换个关键词，或切回其他战役。', en: 'No scenarios match. Change the query or switch campaigns.' })
            : hiddenResultCount > 0
              ? t({
                  zh: `当前先显示 ${visibleRecords.length} / ${filteredRecords.length} 项；继续输入关键词或展开全部匹配项。`,
                  en: `Showing ${visibleRecords.length} of ${filteredRecords.length}. Keep typing or expand the full result set.`,
                })
              : t({
                  zh: `当前展示 ${visibleRecords.length} 项，可直接选择并查看右侧详情。`,
                  en: `Showing ${visibleRecords.length} scenarios. Select one to inspect its details.`,
                })}
        </p>
      </div>

      <div className="planner-scenario-selection__workspace">
        <div className="planner-scenario-selection__catalog">
          <ul
            className="planner-scenario-selection__list"
            role="listbox"
            aria-label={t({ zh: '场景列表', en: 'Scenario list' })}
          >
            {visibleRecords.map((record) => {
              const isSelected = record.id === selectedId

              return (
                <li key={record.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`planner-scenario-selection__item${isSelected ? ' planner-scenario-selection__item--selected' : ''}`}
                    onClick={() => updateSelectedId(record.id)}
                  >
                    <span className="planner-scenario-selection__item-topline">
                      <span className="planner-scenario-selection__item-name">{record.name}</span>
                      <span className="planner-scenario-selection__item-area">
                        {record.objectiveArea !== null
                          ? t({
                              zh: `${record.objectiveArea} 区`,
                              en: `Area ${record.objectiveArea}`,
                            })
                          : t({ zh: '自由游戏', en: 'Free play' })}
                      </span>
                    </span>
                    <span className="planner-scenario-selection__item-meta">
                      <span>{record.campaign}</span>
                      {record.adventure ? <span>{record.adventure}</span> : null}
                      {record.scene ? <span>{record.scene}</span> : null}
                    </span>
                    <span className="planner-scenario-selection__item-tags">
                      <span>{t({ zh: `${record.restrictions.length} 条限制`, en: `${record.restrictions.length} restrictions` })}</span>
                      <span>{t({ zh: `${record.enemyCount} 敌人`, en: `${record.enemyCount} enemies` })}</span>
                    </span>
                  </button>
                </li>
              )
            })}
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

        <aside
          className="planner-scenario-selection__detail"
          aria-label={t({ zh: '选中场景详情', en: 'Selected scenario details' })}
        >
          {selectedRecord ? (
            <>
              <div className="planner-scenario-selection__detail-hero">
                <p className="planner-scenario-selection__detail-kicker">{selectedRecord.campaign}</p>
                <h4 className="planner-scenario-selection__detail-title">{selectedRecord.name}</h4>
                <p className="planner-scenario-selection__detail-subtitle">
                  {selectedRecord.adventure || t({ zh: '未绑定具体冒险名', en: 'No mapped adventure name' })}
                </p>
              </div>

              <dl className="planner-scenario-selection__detail-grid">
                <div>
                  <dt>{t({ zh: '目标区', en: 'Objective' })}</dt>
                  <dd>
                    {selectedRecord.objectiveArea !== null
                      ? t({ zh: `${selectedRecord.objectiveArea} 区完成`, en: `Finish at area ${selectedRecord.objectiveArea}` })
                      : t({ zh: '自由游戏', en: 'Free play' })}
                  </dd>
                </div>
                <div>
                  <dt>{t({ zh: '场景', en: 'Scene' })}</dt>
                  <dd>{selectedRecord.scene || t({ zh: '未记录', en: 'Not recorded' })}</dd>
                </div>
                <div>
                  <dt>{t({ zh: '限制数', en: 'Restrictions' })}</dt>
                  <dd>{selectedRecord.restrictions.length}</dd>
                </div>
                <div>
                  <dt>{t({ zh: '敌人数', en: 'Enemies' })}</dt>
                  <dd>{selectedRecord.enemyCount}</dd>
                </div>
              </dl>

              <section className="planner-scenario-selection__detail-group">
                <h5>{t({ zh: '限制条件', en: 'Restrictions' })}</h5>
                {selectedRecord.restrictions.length > 0 ? (
                  <ul className="planner-scenario-selection__pill-list">
                    {selectedRecord.restrictions.map((restriction) => (
                      <li key={restriction}>{restriction}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="supporting-text">{t({ zh: '无额外限制。', en: 'No additional restrictions.' })}</p>
                )}
              </section>

              <section className="planner-scenario-selection__detail-group">
                <h5>{t({ zh: '奖励与机制', en: 'Rewards and mechanics' })}</h5>
                <div className="planner-scenario-selection__detail-stack">
                  {selectedRecord.rewards.length > 0 ? (
                    <ul className="planner-scenario-selection__pill-list">
                      {selectedRecord.rewards.map((reward) => (
                        <li key={reward}>{reward}</li>
                      ))}
                    </ul>
                  ) : null}
                  {selectedRecord.mechanics.length > 0 ? (
                    <ul className="planner-scenario-selection__pill-list">
                      {selectedRecord.mechanics.map((mechanic) => (
                        <li key={mechanic}>{mechanic}</li>
                      ))}
                    </ul>
                  ) : null}
                  {selectedRecord.rewards.length === 0 && selectedRecord.mechanics.length === 0 ? (
                    <p className="supporting-text">{t({ zh: '当前公共数据还没有补齐奖励或机制描述。', en: 'Public data does not yet include reward or mechanic details here.' })}</p>
                  ) : null}
                </div>
              </section>
            </>
          ) : (
            <div className="planner-scenario-selection__empty" role="status">
              <strong>{t({ zh: '还没有选中场景', en: 'No scenario selected' })}</strong>
              <p>{t({ zh: '先从左侧列表里选一个更接近目标的关卡。', en: 'Choose a scenario from the catalog to inspect its details.' })}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
