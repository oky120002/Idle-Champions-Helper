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
        onClick={() => onSelect(record.id)}
      >
        <span className="planner-scenario-selection__item-topline">
          <span className="planner-scenario-selection__item-name">{record.name}</span>
          <span className="planner-scenario-selection__item-area">
            {record.objectiveArea !== null
              ? t("{p0} 区", { p0: String(record.objectiveArea) })
              : t("自由游戏")}
          </span>
        </span>
        <span className="planner-scenario-selection__item-meta">
          <span>{record.campaign}</span>
          {record.adventure !== '' ? <span>{record.adventure}</span> : null}
          {record.scene !== '' ? <span>{record.scene}</span> : null}
        </span>
        <span className="planner-scenario-selection__item-tags">
          <span>{t("{p0} 条限制", { p0: String(record.restrictions.length) })}</span>
          <span>{t("{p0} 敌人", { p0: String(record.enemyCount) })}</span>
        </span>
      </button>
    </li>
  )
}
