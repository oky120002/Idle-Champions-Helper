import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BackNavigationIcon } from '../app/AppIcons'
import { useI18n } from '../app/i18n'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { WorkbenchContentStack } from '../components/workbench/WorkbenchScaffold'
import { useEvaluatePlacements } from './planner/evaluatePlacementsStore'
import { usePlannerCollections } from './planner/usePlannerCollections'

export function PlannerEvaluatePage() {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { collections, loadState, loadError, selectedVariantId } = usePlannerCollections()
  const [placements] = useEvaluatePlacements()

  const locationState = location.state as
    | { returnTo?: { pathname: string; search: string }; returnLabel?: { zh: string; en: string } }
    | null
  const backTarget = locationState?.returnTo ?? { pathname: '/planner', search: '' }
  const backLabel = locationState?.returnLabel ?? { zh: '返回自动计划', en: 'Back to auto plan' }
  const placedCount = Object.keys(placements).length

  return (
    <ConfiguredWorkbenchPage
      pageClassName="planner-evaluate-page"
      storageKey="planner-evaluate"
      ariaLabel={t({ zh: '自配评估工作台', en: 'Formation evaluate workbench' })}
      shellClassName="workbench-page__shell planner-evaluate-workbench"
      contentScrollRef={contentScrollRef}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: { kind: 'mark', label: 'EVALUATE' },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: t({ zh: '自配评估', en: 'Evaluate' }),
              title: t({ zh: '自配评估', en: 'Formation Evaluate' }),
              detail: t({
                zh: '自摆阵型，查看核心英雄 DPS',
                en: 'Place champions and see carry DPS',
              }),
            },
          },
          {
            region: 'actions',
            section: {
              kind: 'items',
              items: [
                {
                  id: 'back-to-planner',
                  kind: 'button',
                  label: '',
                  title: t(backLabel),
                  icon: <BackNavigationIcon />,
                  tone: 'share',
                  className: 'planner-evaluate-workbench__toolbar-back',
                  onClick: () => navigate(backTarget.pathname + backTarget.search),
                },
              ],
            },
          },
        ],
      }}
    >
      <WorkbenchContentStack>
        {loadState === 'error' ? (
          <section className="surface-card page-shell" role="alert">
            <div className="surface-card__header">
              <div className="surface-card__header-copy">
                <p className="surface-card__description">
                  {t({
                    zh: `加载数据失败：${loadError ?? '未知错误'}`,
                    en: `Failed to load: ${loadError ?? 'unknown error'}`,
                  })}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="surface-card page-shell" aria-busy={loadState === 'loading'} data-testid="planner-evaluate-skeleton">
            <div className="surface-card__header">
              <div className="surface-card__header-copy">
                <p className="surface-card__eyebrow">{t({ zh: '建设中', en: 'Work in progress' })}</p>
                <h3 className="surface-card__title">{t({ zh: '自配评估面板', en: 'Formation evaluate panel' })}</h3>
                <p className="surface-card__description">
                  {t({
                    zh: `阶段 1 骨架：已加载 ${collections.variants.length} 个场景，当前场景 ${selectedVariantId ?? '—'}，已摆 ${placedCount} 个英雄。棋盘编辑与 DPS 评分即将上线。`,
                    en: `Phase 1 skeleton: ${collections.variants.length} variants loaded, current ${selectedVariantId ?? '—'}, ${placedCount} placed. Board and scoring coming soon.`,
                  })}
                </p>
              </div>
            </div>
          </section>
        )}
      </WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )
}
