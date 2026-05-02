import { useRef } from 'react'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import { useI18n } from '../app/i18n'

export function PlannerPage() {
  const { t } = useI18n()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)

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
      <section className="surface-card page-shell">
        <div className="surface-card__header">
          <div className="surface-card__header-copy">
            <p className="surface-card__description">
              {t({
                zh: '自动计划功能正在开发中。请先完成用户数据导入。',
                en: 'Automatic planner is under development. Please import user data first.',
              })}
            </p>
          </div>
        </div>
      </section>
    </ConfiguredWorkbenchPage>
  )
}
