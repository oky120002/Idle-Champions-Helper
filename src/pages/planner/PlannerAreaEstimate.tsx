import type { AreaBound, AreaEstimationResult } from '../../domain/simulator/areaEstimation'
import { buildAreaDashboardModel } from '../../domain/simulator/areaDashboard'
import type { ConstraintKind } from '../../domain/planner/recommendationTypes'
import { useI18n, type MessageRef } from '../../app/i18n'

const BOUND_LABELS: Record<AreaBound, MessageRef> = {
  survival: { key: '存活受限' },
  armor: { key: '护甲受限' },
  'hits-based': { key: '命中型受限' },
  bud: { key: '伤害受限' },
  'max-area': { key: '已达上限' },
}

const CONSTRAINT_LABELS: Record<ConstraintKind, MessageRef> = {
  armor: { key: '护甲' },
  'hits-based': { key: '命中型' },
  'damage-reduction': { key: '伤害削减' },
  'enemy-buff': { key: '敌人强化' },
  'health-drain': { key: '持续掉血' },
}

// 进度条归一化基数：UX 选择（多数阵型 100–1500 区间），非 MAX_AREA(2501)——用 2501 会使进度条过短。
const MAX_AREA_NORMALIZER = 1500

export interface PlannerAreaEstimateProps {
  readonly areaEstimate: AreaEstimationResult
  readonly activeConstraints?: readonly ConstraintKind[] | undefined
}

function buildDiagnosisMessage(
  wall: ReturnType<typeof buildAreaDashboardModel>['wall'],
  gap: ReturnType<typeof buildAreaDashboardModel>['gap'],
  t: ReturnType<typeof useI18n>['t'],
) {
  if (wall === 'design-limit') return t("已接近设计上限，继续提升阵型不会突破当前区域上限。")
  if (wall === 'survival') return t("当前主要瓶颈是存活能力，优先提升生命、治疗或减伤。")
  if (wall === 'mechanic') return t("当前主要瓶颈是场景机制，优先处理护甲或命中次数要求。")
  if (gap === 'large') return t("当前主要瓶颈是伤害，差距达到质变级别。")
  if (gap === 'near') return t("当前主要瓶颈是伤害，小幅提升可能突破。")
  return t("当前伤害与目标层生命接近，可继续比较阵型差异。")
}

export function PlannerAreaEstimate({ areaEstimate, activeConstraints = [] }: PlannerAreaEstimateProps) {
  const { t } = useI18n()
  const { area, boundBy, killableArea, survivableArea } = areaEstimate
  const dashboard = buildAreaDashboardModel(areaEstimate)
  const boundLabel = t(BOUND_LABELS[boundBy])
  const killablePct = Math.min(100, (killableArea / MAX_AREA_NORMALIZER) * 100)
  const survivablePct = Math.min(100, (survivableArea / MAX_AREA_NORMALIZER) * 100)
  const diagnosisMessage = buildDiagnosisMessage(dashboard.wall, dashboard.gap, t)

  return (
    <section data-section="area-estimate" className="planner-area-estimate">
      <h4 className="planner-result-card__section-title">
        {t("推图预估")}
      </h4>

      <div className="planner-area-estimate__hero">
        <span
          className="planner-area-estimate__area-value"
          data-testid="planner-area-estimate"
        >
          {t("第 {p0} 层", { p0: String(area) })}
        </span>
        <span className="planner-area-estimate__bound-badge" data-bound={boundBy}>
          {boundLabel}
        </span>
      </div>

      <dl className="planner-area-estimate__metrics">
        <div className="planner-area-estimate__metric">
          <dt>{t("击杀上限")}</dt>
          <dd>
            <span className="planner-area-estimate__metric-value">{String(killableArea)}</span>
            <span className="planner-area-estimate__bar" aria-hidden="true">
              <span
                className="planner-area-estimate__bar-fill"
                style={{ width: `${String(killablePct)}%` }}
              />
            </span>
          </dd>
        </div>
        <div className="planner-area-estimate__metric">
          <dt>{t("存活上限")}</dt>
          <dd>
            <span className="planner-area-estimate__metric-value">{String(survivableArea)}</span>
            <span className="planner-area-estimate__bar" aria-hidden="true">
              <span
                className="planner-area-estimate__bar-fill"
                style={{ width: `${String(survivablePct)}%` }}
              />
            </span>
          </dd>
        </div>
      </dl>

      <dl className="planner-area-estimate__comparison" data-testid="planner-area-comparison">
        <div>
          <dt>{t("当前 BUD")}</dt>
          <dd>{dashboard.bud}</dd>
        </div>
        <div>
          <dt>{t("目标层生命")}</dt>
          <dd>{dashboard.targetHealth}</dd>
        </div>
        {dashboard.effectiveHealth !== null && dashboard.targetDamage !== null ? (
          <>
            <div>
              <dt>{t("有效生命")}</dt>
              <dd>{dashboard.effectiveHealth}</dd>
            </div>
            <div>
              <dt>{t("目标层伤害")}</dt>
              <dd>{dashboard.targetDamage}</dd>
            </div>
          </>
        ) : null}
      </dl>

      <p className="planner-area-estimate__diagnosis" data-testid="planner-area-diagnosis">
        {diagnosisMessage}
      </p>

      <p className="planner-area-estimate__note">
        {t("绝对值未校准，仅供参考相对比较")}
      </p>

      {activeConstraints.length > 0 ? (
        <p
          className="planner-area-estimate__constraints"
          data-testid="planner-viability-constraints"
        >
          {t("活跃约束：")}
          {activeConstraints.map((key) => t(CONSTRAINT_LABELS[key])).join(t("、"))}
        </p>
      ) : null}
    </section>
  )
}
