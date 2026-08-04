import { useI18n } from '../../app/i18n'
import type { PlannerScenarioRecord } from './plannerScenarioModel'

interface PlannerScenarioListItemProps {
  readonly record: PlannerScenarioRecord
  readonly isSelected: boolean
  readonly onSelect: (id: string) => void
}

export function PlannerScenarioListItem({ record, isSelected, onSelect }: PlannerScenarioListItemProps) {
  const { t } = useI18n()

  return (
    <li role="option" aria-selected={isSelected}>
      <button
        type="button"
        className={`planner-scenario-selection__item${isSelected ? ' planner-scenario-selection__item--selected' : ''}`}
        onClick={() => { onSelect(record.id) }}
      >
        <span className="planner-scenario-selection__item-topline">
          <span className="planner-scenario-selection__item-name">{record.name}</span>
          <span className="planner-scenario-selection__item-area">
            {record.objectiveArea !== null
              ? t({
                  zh: `${String(record.objectiveArea)} 区`,
                  en: `Area ${String(record.objectiveArea)}`,
                })
              : t({ zh: '自由游戏', en: 'Free play' })}
          </span>
        </span>
        <span className="planner-scenario-selection__item-meta">
          <span>{record.campaign}</span>
          {record.adventure !== '' ? <span>{record.adventure}</span> : null}
          {record.scene !== '' ? <span>{record.scene}</span> : null}
        </span>
        <span className="planner-scenario-selection__item-tags">
          <span>{t({ zh: `${String(record.restrictions.length)} 条限制`, en: `${String(record.restrictions.length)} restrictions` })}</span>
          <span>{t({ zh: `${String(record.enemyCount)} 敌人`, en: `${String(record.enemyCount)} enemies` })}</span>
        </span>
      </button>
    </li>
  )
}
