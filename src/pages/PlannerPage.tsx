import { useRef } from 'react'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import type { PlannerRecommendationBlocker } from '../domain/planner/recommendationTypes'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import { useI18n } from '../app/i18n'
import { PlannerProfileState } from './planner/PlannerProfileState'
import { PlannerResultCard } from './planner/PlannerResultCard'
import { PlannerScoringMode } from './planner/PlannerScoringMode'
import { PlannerSavePreset } from './planner/PlannerSavePreset'
import { PlannerScenarioSelection } from './planner/PlannerScenarioSelection'
import { usePlannerPageModel } from './planner/usePlannerPageModel'

function getPlannerBlockerCopy(blocker: PlannerRecommendationBlocker, t: ReturnType<typeof useI18n>['t']) {
  switch (blocker) {
    case 'missing-profile':
      return {
        title: t({ zh: '导入个人数据后才会生成推荐。', en: 'Import local profile data before generating recommendations.' }),
        description: t({
          zh: '当前 planner 只会基于本地已拥有英雄计算阵型，并阻止无快照时的假推荐。',
          en: 'The planner now only computes formations from locally imported owned heroes and blocks mock recommendations without a profile snapshot.',
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
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const {
    championById,
    collections,
    loadError,
    loadState,
    plannerRecommendation,
    scoringMode,
    selectedVariantId,
    selectVariantId,
    selectScoringMode,
  } = usePlannerPageModel()

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
                </div>
              </section>

              <div className="planner-page__result-column">
                {plannerRecommendation.blocker ? (
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

                {plannerRecommendation.result ? (
                  <>
                    <PlannerResultCard
                      {...plannerRecommendation.result}
                      scoringMode={scoringMode}
                      slots={plannerRecommendation.slots}
                      championById={championById}
                    />
                    <PlannerSavePreset
                      result={plannerRecommendation.result}
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
