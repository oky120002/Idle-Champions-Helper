import { useI18n, type LocaleText } from '../../app/i18n'
import type { PlannerScenarioRecord } from './plannerScenarioModel'

interface PlannerScenarioDetailProps {
  readonly record: PlannerScenarioRecord | null
}

type Translate = (text: LocaleText) => string

function renderRewardsAndMechanics(record: PlannerScenarioRecord, t: Translate) {
  return (
    <section className="planner-scenario-selection__detail-group">
      <h5>{t({ zh: '奖励与机制', en: 'Rewards and mechanics' })}</h5>
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
          <p className="supporting-text">{t({ zh: '当前公共数据还没有补齐奖励或机制描述。', en: 'Public data does not yet include reward or mechanic details here.' })}</p>
        ) : null}
      </div>
    </section>
  )
}

function renderScenarioDetailBody(record: PlannerScenarioRecord, t: Translate) {
  const objectiveText = record.objectiveArea !== null
    ? t({ zh: `${String(record.objectiveArea)} 区完成`, en: `Finish at area ${String(record.objectiveArea)}` })
    : t({ zh: '自由游戏', en: 'Free play' })
  const adventureText = record.adventure !== '' ? record.adventure : t({ zh: '未绑定具体冒险名', en: 'No mapped adventure name' })
  const sceneText = record.scene !== '' ? record.scene : t({ zh: '未记录', en: 'Not recorded' })

  return (
    <>
      <div className="planner-scenario-selection__detail-hero">
        <p className="planner-scenario-selection__detail-kicker">{record.campaign}</p>
        <h4 className="planner-scenario-selection__detail-title">{record.name}</h4>
        <p className="planner-scenario-selection__detail-subtitle">{adventureText}</p>
      </div>

      <dl className="planner-scenario-selection__detail-grid">
        <div>
          <dt>{t({ zh: '目标区', en: 'Objective' })}</dt>
          <dd>{objectiveText}</dd>
        </div>
        <div>
          <dt>{t({ zh: '场景', en: 'Scene' })}</dt>
          <dd>{sceneText}</dd>
        </div>
        <div>
          <dt>{t({ zh: '限制数', en: 'Restrictions' })}</dt>
          <dd>{record.restrictions.length}</dd>
        </div>
        <div>
          <dt>{t({ zh: '敌人数', en: 'Enemies' })}</dt>
          <dd>{record.enemyCount}</dd>
        </div>
      </dl>

      <section className="planner-scenario-selection__detail-group">
        <h5>{t({ zh: '限制条件', en: 'Restrictions' })}</h5>
        {record.restrictions.length > 0 ? (
          <ul className="planner-scenario-selection__pill-list">
            {record.restrictions.map((restriction) => (
              <li key={restriction}>{restriction}</li>
            ))}
          </ul>
        ) : (
          <p className="supporting-text">{t({ zh: '无额外限制。', en: 'No additional restrictions.' })}</p>
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
      aria-label={t({ zh: '选中场景详情', en: 'Selected scenario details' })}
    >
      {record !== null ? (
        renderScenarioDetailBody(record, t)
      ) : (
        <div className="planner-scenario-selection__empty" role="status">
          <strong>{t({ zh: '还没有选中场景', en: 'No scenario selected' })}</strong>
          <p>{t({ zh: '先从左侧列表里选一个更接近目标的关卡。', en: 'Choose a scenario from the catalog to inspect its details.' })}</p>
        </div>
      )}
    </aside>
  )
}
