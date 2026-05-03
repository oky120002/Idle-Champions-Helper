import { useRef } from 'react'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import { useI18n } from '../app/i18n'
import { PlannerProfileState } from './planner/PlannerProfileState'
import { PlannerResultCard } from './planner/PlannerResultCard'
import { PlannerSavePreset } from './planner/PlannerSavePreset'
import { PlannerScenarioSelection } from './planner/PlannerScenarioSelection'
import { usePlannerPageModel } from './planner/usePlannerPageModel'

export function PlannerPage() {
  const { t } = useI18n()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const {
    collections,
    loadError,
    loadState,
    plannerRecommendation,
    selectedVariantId,
    selectVariantId,
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
            <section className="surface-card page-shell" aria-busy={loadState === 'loading'}>
              <div className="surface-card__header">
                <div className="surface-card__header-copy">
                  <p className="surface-card__eyebrow">
                    {t({ zh: '场景', en: 'Scenario' })}
                  </p>
                  <h2 className="surface-card__title">
                    {t({ zh: '选择目标关卡', en: 'Choose a target scenario' })}
                  </h2>
                </div>
              </div>
              <div className="surface-card__body">
                <PlannerScenarioSelection
                  variants={collections.variants}
                  selectedId={selectedVariantId}
                  onSelectedIdChange={selectVariantId}
                />
              </div>
            </section>

            {plannerRecommendation.result ? (
              <>
                <PlannerResultCard {...plannerRecommendation.result} />
                <PlannerSavePreset
                  result={plannerRecommendation.result}
                  layoutId={plannerRecommendation.layoutId}
                  scenarioRef={plannerRecommendation.scenarioRef}
                />
              </>
            ) : null}
          </>
        )}
      </WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )
}
