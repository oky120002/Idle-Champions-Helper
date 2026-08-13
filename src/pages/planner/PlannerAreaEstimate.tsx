import type { AreaBound, AreaEstimationResult } from '../../domain/simulator/areaEstimation'
import type { ConstraintKind } from '../../domain/planner/recommendationTypes'
import { useI18n, type LocaleText } from '../../app/i18n'

const BOUND_LABELS: Record<AreaBound, LocaleText> = {
  survival: { zh: '存活受限', en: 'Survival-bound' },
  armor: { zh: '护甲受限', en: 'Armor-bound' },
  'hits-based': { zh: '命中型受限', en: 'Hits-bound' },
  bud: { zh: '伤害受限', en: 'BUD-bound' },
  'max-area': { zh: '已达上限', en: 'Max area' },
}

const CONSTRAINT_LABELS: Record<ConstraintKind, LocaleText> = {
  armor: { zh: '护甲', en: 'Armor' },
  'hits-based': { zh: '命中型', en: 'Hits-based' },
  'damage-reduction': { zh: '伤害削减', en: 'Dmg reduction' },
  'enemy-buff': { zh: '敌人强化', en: 'Enemy buff' },
  'health-drain': { zh: '持续掉血', en: 'Health drain' },
}

// 进度条归一化基数：UX 选择（多数阵型 100–1500 区间），非 MAX_AREA(2501)——用 2501 会使进度条过短。
const MAX_AREA_NORMALIZER = 1500

export interface PlannerAreaEstimateProps {
  readonly areaEstimate: AreaEstimationResult
  readonly activeConstraints?: readonly ConstraintKind[] | undefined
}

export function PlannerAreaEstimate({ areaEstimate, activeConstraints = [] }: PlannerAreaEstimateProps) {
  const { t } = useI18n()
  const { area, boundBy, killableArea, survivableArea } = areaEstimate
  const boundLabel = t(BOUND_LABELS[boundBy])
  const killablePct = Math.min(100, (killableArea / MAX_AREA_NORMALIZER) * 100)
  const survivablePct = Math.min(100, (survivableArea / MAX_AREA_NORMALIZER) * 100)

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
