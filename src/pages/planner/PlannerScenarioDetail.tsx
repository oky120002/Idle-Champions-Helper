import { useI18n, type MessageRef, type TranslateParams } from '../../app/i18n'
import type { PlannerScenarioRecord } from './plannerScenarioModel'

interface PlannerScenarioDetailProps {
  readonly record: PlannerScenarioRecord | null
}

type Translate = (text: string | MessageRef, params?: TranslateParams) => string

function renderRewardsAndMechanics(record: PlannerScenarioRecord, t: Translate) {
  return (
    <section className="planner-scenario-selection__detail-group">
      <h5>{t("奖励与机制")}</h5>
      <div className="planner-scenario-selection__detail-stack">
        {record.rewards.length > 0 ? (
          <ul className="planner-scenario-selection__pill-list">
            {record.rewards.map((reward) => (
              <li key={reward}>{reward}</li>
            ))}
          </ul>
        ) : null}
        {record.mechanics.length > 0 ? (
          <ul className="planner-scenario-selection__pill-list">
            {record.mechanics.map((mechanic) => (
              <li key={mechanic}>{mechanic}</li>
            ))}
          </ul>
        ) : null}
        {record.rewards.length === 0 && record.mechanics.length === 0 ? (
          <p className="supporting-text">{t("当前公共数据还没有补齐奖励或机制描述。")}</p>
        ) : null}
      </div>
    </section>
  )
}

function renderScenarioDetailBody(record: PlannerScenarioRecord, t: Translate) {
  const objectiveText = record.objectiveArea !== null
    ? t("{p0} 区完成", { p0: String(record.objectiveArea) })
    : t("自由游戏")
  const adventureText = record.adventure !== '' ? record.adventure : t("未绑定具体冒险名")
  const sceneText = record.scene !== '' ? record.scene : t("未记录")

  return (
    <>
      <div className="planner-scenario-selection__detail-hero">
        <p className="planner-scenario-selection__detail-kicker">{record.campaign}</p>
        <h4 className="planner-scenario-selection__detail-title">{record.name}</h4>
        <p className="planner-scenario-selection__detail-subtitle">{adventureText}</p>
      </div>

      <dl className="planner-scenario-selection__detail-grid">
        <div>
          <dt>{t("目标区")}</dt>
          <dd>{objectiveText}</dd>
        </div>
        <div>
          <dt>{t("场景")}</dt>
          <dd>{sceneText}</dd>
        </div>
        <div>
          <dt>{t("限制数")}</dt>
          <dd>{record.restrictions.length}</dd>
        </div>
        <div>
          <dt>{t("敌人数")}</dt>
          <dd>{record.enemyCount}</dd>
        </div>
      </dl>

      <section className="planner-scenario-selection__detail-group">
        <h5>{t("限制条件")}</h5>
        {record.restrictions.length > 0 ? (
          <ul className="planner-scenario-selection__pill-list">
            {record.restrictions.map((restriction) => (
              <li key={restriction}>{restriction}</li>
            ))}
          </ul>
        ) : (
          <p className="supporting-text">{t("无额外限制。")}</p>
        )}
      </section>

      {renderRewardsAndMechanics(record, t)}
    </>
  )
}

export function PlannerScenarioDetail({ record }: PlannerScenarioDetailProps) {
  const { t } = useI18n()

  return (
    <aside
      className="planner-scenario-selection__detail"
      aria-label={t("选中场景详情")}
    >
      {record !== null ? (
        renderScenarioDetailBody(record, t)
      ) : (
        <div className="planner-scenario-selection__empty" role="status">
          <strong>{t("还没有选中场景")}</strong>
          <p>{t("先从左侧列表里选一个更接近目标的关卡。")}</p>
        </div>
      )}
    </aside>
  )
}
