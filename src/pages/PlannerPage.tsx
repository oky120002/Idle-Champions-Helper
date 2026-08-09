/* eslint-disable max-lines -- 页面编排型组件，职责为组合子组件，JSX 长度源于编排广度而非逻辑复杂度；拆分会增加常见修改的跨文件跳转 */
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import type { PlannerRecommendationBlocker } from '../domain/planner/recommendationTypes'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import { useI18n } from '../app/i18n'
import { PlannerProfileState } from './planner/PlannerProfileState'
import { PlannerResultCard } from './planner/PlannerResultCard'
import { PlannerScoringMode } from './planner/PlannerScoringMode'
import { PlannerCandidateMode } from './planner/PlannerCandidateMode'
import { PlannerComputationMode } from './planner/PlannerComputationMode'
import { PlannerStackCount } from './planner/PlannerStackCount'
import { PlannerSurvivableArea } from './planner/PlannerSurvivableArea'
import { PlannerGoldLevel } from './planner/PlannerGoldLevel'
import { PlannerHypotheticalEquipment } from './planner/PlannerHypotheticalEquipment'
import { PlannerSpecializationPanel } from './planner/PlannerSpecializationPanel'
import { PlannerSavePreset } from './planner/PlannerSavePreset'
import { PlannerImportFormation } from './planner/PlannerImportFormation'
import { PlannerScenarioSelection } from './planner/PlannerScenarioSelection'
import { PlannerTopLineups } from './planner/PlannerTopLineups'
import { PlannerCarryLock } from './planner/PlannerCarryLock'
import { PlannerSlotLock } from './planner/PlannerSlotLock'
import { usePlannerPageModel } from './planner/usePlannerPageModel'

function getPlannerBlockerCopy(blocker: PlannerRecommendationBlocker, t: ReturnType<typeof useI18n>['t']) {
  switch (blocker) {
    case 'missing-profile':
      return {
        title: t({ zh: '导入个人数据后才会生成推荐。', en: 'Import local profile data before generating recommendations.' }),
        description: t({
          zh: '默认仅基于本地已拥有英雄计算，导入个人数据后最准；也可将「候选范围」切到「全部英雄（假设基线）」直接预览 DPS。',
          en: 'By default the planner uses only your owned heroes; import your profile for best accuracy, or switch Candidate pool to "All hypothetical" to preview DPS without a profile.',
        }),
      }
    case 'missing-formation':
      return {
        title: t({ zh: '当前场景没有匹配的阵型布局。', en: 'No matching formation layout exists for this scenario.' }),
        description: t({
          zh: '请先补齐官方阵型布局映射，再继续评估该场景。',
          en: 'Add the official formation layout mapping before evaluating this scenario.',
        }),
      }
    case 'insufficient-owned-heroes':
      return {
        title: t({ zh: '当前已拥有英雄不足以填满该阵型。', en: 'Owned heroes are insufficient to fill this formation.' }),
        description: t({
          zh: '第一条真实纵切当前只允许使用已拥有英雄，不会再拿公共英雄数据补空位。',
          en: 'The first real vertical slice only uses owned heroes and will not backfill empty slots with public roster data.',
        }),
      }
    case 'no-legal-recommendation':
      return {
        title: t({ zh: '当前没有满足 seat 规则的推荐结果。', en: 'No legal recommendation satisfies the current seat rules.' }),
        description: t({
          zh: '请调整场景或导入更多本地英雄数据后重试。',
          en: 'Try another scenario or import more local hero data, then retry.',
        }),
      }
  }
}

export function PlannerPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const {
    candidateMode,
    championById,
    collections,
    computationMode,
    equipmentEnchant,
    equipmentRarity,
    goldBudget,
    goldLevelConversion,
    goldLevelMode,
    globalLevel,
    lockedCarryHeroId,
    lockedSlots,
    loadError,
    loadState,
    manualStackCount,
    minSurvivableArea,
    plannerRecommendation,
    profileSnapshot,
    recommendError,
    recommendLoading,
    scoringMode,
    selectedResultIndex,
    selectedVariantId,
    specializationOverrides,
    clearHeroSpecializationOverride,
    clearSlotLock,
    selectCandidateMode,
    selectComputationMode,
    selectEquipmentEnchant,
    selectEquipmentRarity,
    selectGoldLevelMode,
    selectManualStackCount,
    selectMinSurvivableArea,
    selectLockedCarryHeroId,
    selectResultIndex,
    selectVariantId,
    selectScoringMode,
    setGoldBudget,
    setGlobalLevel,
    setHeroSpecializationOverride,
    lockSlot,
  } = usePlannerPageModel()

  // 自配评估面板「回填到自动计划」带过来的场景与锁定槽位。
  // 必须先切到来源场景（slotId 随场景变），再按槽位逐个写入——否则旧场景的 slotId
  // 落到新场景上要么对不上被忽略，要么撞上同 id 的不同位置。
  // location.key 随导航变化触发；selectVariantId/lockSlot 是 useCallback 稳定引用。
  useEffect(() => {
    const navigateState = location.state as
      | { lockedSlotsFromEvaluate?: Record<string, string>; variantIdFromEvaluate?: string | null }
      | null
    const locked = navigateState?.lockedSlotsFromEvaluate
    const variantId = navigateState?.variantIdFromEvaluate
    if (!locked) return
    if (variantId != null && variantId !== '') {
      selectVariantId(variantId)
    }
    Object.entries(locked).forEach(([slotId, heroId]) => lockSlot(slotId, heroId))
  }, [location.key, location.state, selectVariantId, lockSlot])

  const safeResultIndex = plannerRecommendation.results.length > 0
    ? Math.min(selectedResultIndex, plannerRecommendation.results.length - 1)
    : 0
  const selectedResult = plannerRecommendation.results[safeResultIndex] ?? plannerRecommendation.result

  return (
    <ConfiguredWorkbenchPage
      pageClassName="planner-page"
      storageKey="planner"
      ariaLabel={t({ zh: '自动计划工作台', en: 'Automatic Planner workbench' })}
      shellClassName="workbench-page__shell planner-workbench"
      contentScrollRef={contentScrollRef}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'mark',
              label: 'PLANNER',
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: t({ zh: '自动计划', en: 'Auto Plan' }),
              title: t({ zh: '自动计划', en: 'Automatic Planner' }),
              detail: t({
                zh: '基于本地用户数据推荐最优阵型',
                en: 'Recommend optimal formations based on local user data',
              }),
            },
          },
          {
            region: 'actions',
            section: {
              kind: 'items',
              items: [
                {
                  id: 'open-evaluate',
                  kind: 'button',
                  label: t({ zh: '自配评估', en: 'Evaluate' }),
                  title: t({ zh: '自摆阵型看核心英雄 DPS', en: 'Place champions and see carry DPS' }),
                  tone: 'share',
                  onClick: () =>
                    navigate('/planner/evaluate', {
                      state: {
                        returnTo: { pathname: '/planner', search: location.search },
                        returnLabel: { zh: '返回自动计划', en: 'Back to auto plan' },
                        initialVariantId: selectedVariantId,
                      },
                    }),
                },
              ],
            },
          },
        ],
      }}
    >
      <WorkbenchContentStack>
        <PlannerProfileState />

        {loadState === 'error' ? (
          <section className="surface-card page-shell" role="alert">
            <div className="surface-card__header">
              <div className="surface-card__header-copy">
                <p className="surface-card__description">
                  {t({
                    zh: `加载自动计划数据失败：${loadError ?? '未知错误'}`,
                    en: `Failed to load planner data: ${loadError ?? 'unknown error'}`,
                  })}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="planner-page__workspace" aria-busy={loadState === 'loading'}>
              <section className="surface-card page-shell planner-page__scenario-panel">
                <div className="surface-card__body">
                  <PlannerScenarioSelection
                    variants={collections.variants}
                    selectedId={selectedVariantId}
                    onSelectedIdChange={selectVariantId}
                  />
                  <PlannerScoringMode value={scoringMode} onChange={selectScoringMode} />
                  <PlannerCandidateMode value={candidateMode} onChange={selectCandidateMode} />
                  <PlannerComputationMode value={computationMode} onChange={selectComputationMode} />
                  <PlannerStackCount value={manualStackCount} onChange={selectManualStackCount} />
                  <PlannerSurvivableArea value={minSurvivableArea} onChange={selectMinSurvivableArea} />
                  <PlannerGoldLevel
                    mode={goldLevelMode}
                    goldBudget={goldBudget}
                    globalLevel={globalLevel}
                    conversion={goldLevelConversion}
                    onModeChange={selectGoldLevelMode}
                    onGoldBudgetChange={setGoldBudget}
                    onGlobalLevelChange={setGlobalLevel}
                  />
                  {!profileSnapshot ? (
                    <PlannerHypotheticalEquipment
                      rarity={equipmentRarity}
                      enchant={equipmentEnchant}
                      onRarityChange={selectEquipmentRarity}
                      onEnchantChange={selectEquipmentEnchant}
                    />
                  ) : null}
                  <PlannerSpecializationPanel
                    ownedHeroes={profileSnapshot?.ownedHeroes ?? []}
                    catalog={collections.specializationCatalog ?? {}}
                    overrides={specializationOverrides}
                    championById={championById}
                    onSetOverride={setHeroSpecializationOverride}
                    onClearOverride={clearHeroSpecializationOverride}
                  />
                </div>
              </section>

              <div className="planner-page__result-column">
                {recommendError != null && recommendError !== '' ? (
                  <section className="surface-card page-shell" role="alert">
                    <div className="surface-card__header">
                      <div className="surface-card__header-copy">
                        <p className="surface-card__description">
                          {t({ zh: `计算失败：${recommendError}`, en: `Compute failed: ${recommendError}` })}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
                {recommendLoading ? (
                  <section
                    className="surface-card page-shell planner-page__compute-loading"
                    role="status"
                    aria-busy="true"
                    data-testid="planner-recommend-loading"
                  >
                    <div className="surface-card__header">
                      <div className="surface-card__header-copy">
                        <p className="surface-card__description">
                          {t({ zh: '正在计算推荐阵型…', en: 'Computing recommendation…' })}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
                {plannerRecommendation.blocker != null ? (
                  <section className="surface-card page-shell planner-page__status-panel" role="status">
                    <div className="surface-card__header">
                      <div className="surface-card__header-copy">
                        <p className="surface-card__eyebrow">
                          {t({ zh: '推荐状态', en: 'Recommendation status' })}
                        </p>
                        <h3 className="surface-card__title">
                          {getPlannerBlockerCopy(plannerRecommendation.blocker, t).title}
                        </h3>
                        <p className="surface-card__description">
                          {getPlannerBlockerCopy(plannerRecommendation.blocker, t).description}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}

                {selectedResult ? (
                  <>
                    <PlannerTopLineups
                      results={plannerRecommendation.results}
                      selectedIndex={safeResultIndex}
                      championById={championById}
                      onSelect={selectResultIndex}
                    />
                    <PlannerCarryLock
                      championById={championById}
                      value={lockedCarryHeroId}
                      onChange={selectLockedCarryHeroId}
                    />
                    <PlannerResultCard
                      {...selectedResult}
                      scoringMode={scoringMode}
                      slots={plannerRecommendation.slots}
                      championById={championById}
                    />
                    <PlannerSlotLock
                      slots={plannerRecommendation.slots}
                      placements={selectedResult.placements}
                      championById={championById}
                      lockedSlots={lockedSlots}
                      onLock={lockSlot}
                      onClearLock={clearSlotLock}
                    />
                    <PlannerSavePreset
                      result={selectedResult}
                      layoutId={plannerRecommendation.layoutId}
                      scenarioRef={plannerRecommendation.scenarioRef}
                    />
                    <PlannerImportFormation
                      result={selectedResult}
                      layoutId={plannerRecommendation.layoutId}
                      scenarioRef={plannerRecommendation.scenarioRef}
                    />
                  </>
                ) : null}
              </div>
            </section>
          </>
        )}
      </WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )
}
