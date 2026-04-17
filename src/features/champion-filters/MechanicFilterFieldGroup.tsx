import type { ReactNode } from 'react'
import type { AppLocale } from '../../app/i18n'
import { FieldGroup } from '../../components/FieldGroup'
import {
  getChampionMechanicCategoryLabel,
  getChampionTagLabel,
} from '../../domain/championTags'
import type { MechanicOptionGroup } from './types'

interface MechanicFilterFieldGroupProps {
  locale: AppLocale
  label: ReactNode
  hint?: ReactNode
  groups: MechanicOptionGroup[]
  selectedValues: string[]
  onReset: () => void
  onToggle: (value: string) => void
  allLabel: ReactNode
  groupHint: (groupId: MechanicOptionGroup['id']) => ReactNode
  className?: string
}

export function MechanicFilterFieldGroup({
  locale,
  label,
  hint,
  groups,
  selectedValues,
  onReset,
  onToggle,
  allLabel,
  groupHint,
  className = 'filter-group',
}: MechanicFilterFieldGroupProps) {
  return (
    <FieldGroup label={label} hint={hint} className={className}>
      <div className="filter-chip-grid">
        <button
          type="button"
          className={selectedValues.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
          aria-pressed={selectedValues.length === 0}
          onClick={onReset}
        >
          {allLabel}
        </button>
      </div>

      <div className="filter-subgroup-stack">
        {groups.map((group) => (
          <section key={group.id} className="filter-subgroup">
            <div className="filter-subgroup__header">
              <strong className="filter-subgroup__title">
                {getChampionMechanicCategoryLabel(group.id, locale)}
              </strong>
              <p className="filter-subgroup__hint">{groupHint(group.id)}</p>
            </div>

            <div className="filter-chip-grid">
              {group.options.map((mechanic) => (
                <button
                  key={mechanic}
                  type="button"
                  className={selectedValues.includes(mechanic) ? 'filter-chip filter-chip--active' : 'filter-chip'}
                  aria-pressed={selectedValues.includes(mechanic)}
                  onClick={() => onToggle(mechanic)}
                >
                  {getChampionTagLabel(mechanic, locale)}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </FieldGroup>
  )
}
