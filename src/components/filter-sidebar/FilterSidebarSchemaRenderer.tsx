import { Fragment, type ReactNode } from 'react'
import { FilterDisclosureSection } from '../FilterDisclosureSection'
import { FilterChipMultiSelectField } from './FilterChipMultiSelectField'
import { FilterChipSingleSelectField } from './FilterChipSingleSelectField'
import { FilterSearchField } from './FilterSearchField'
import { FilterSingleSelectField } from './FilterSingleSelectField'
import { FilterSegmentedField } from './FilterSegmentedField'

type FilterSidebarFieldValue = string | number

interface FilterSidebarBaseFieldSchema {
  id: string
}

interface FilterSidebarSearchFieldSchema extends FilterSidebarBaseFieldSchema {
  kind: 'search'
  label: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  placeholder?: string
  className?: string
  type?: 'search' | 'text'
}

interface FilterSidebarSegmentedFieldSchema extends FilterSidebarBaseFieldSchema {
  kind: 'segmented'
  label: ReactNode
  value: string
  onChange: (value: string) => void
  groupLabel: string
  options: Array<{ value: string; label: ReactNode }>
  hint?: ReactNode
  className?: string
}

interface FilterSidebarSelectFieldSchema extends FilterSidebarBaseFieldSchema {
  kind: 'select'
  label: ReactNode
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: ReactNode }>
  hint?: ReactNode
  className?: string
}

interface FilterSidebarChipSingleFieldSchema extends FilterSidebarBaseFieldSchema {
  kind: 'chip-single'
  label: ReactNode
  value: string
  onChange: (value: string) => void
  groupLabel: string
  options: Array<{ value: string; label: ReactNode; count?: number }>
  hint?: ReactNode
  className?: string
}

interface FilterSidebarChipMultiFieldSchema extends FilterSidebarBaseFieldSchema {
  kind: 'chip-multi'
  label: ReactNode
  options: Array<{ id: FilterSidebarFieldValue; label: ReactNode; count?: number }>
  selectedValues: FilterSidebarFieldValue[]
  onReset: () => void
  onToggle: (value: FilterSidebarFieldValue) => void
  allLabel: ReactNode
  hint?: ReactNode
  className?: string
}

interface FilterSidebarCustomFieldSchema extends FilterSidebarBaseFieldSchema {
  kind: 'custom'
  render: () => ReactNode
}

export type FilterSidebarFieldSchema =
  | FilterSidebarSearchFieldSchema
  | FilterSidebarSegmentedFieldSchema
  | FilterSidebarSelectFieldSchema
  | FilterSidebarChipSingleFieldSchema
  | FilterSidebarChipMultiFieldSchema
  | FilterSidebarCustomFieldSchema

interface FilterSidebarPlainGroupSchema {
  kind: 'plain'
  id: string
  label?: ReactNode
  fields: FilterSidebarFieldSchema[]
}

interface FilterSidebarDisclosureSchema {
  id: string
  title: string
  summary: string
  status: string
  isExpanded: boolean
  onToggle: () => void
  fields: FilterSidebarFieldSchema[]
}

interface FilterSidebarDisclosureGroupSchema {
  kind: 'disclosure-group'
  id: string
  label?: ReactNode
  sections: FilterSidebarDisclosureSchema[]
}

export type FilterSidebarGroupSchema =
  | FilterSidebarPlainGroupSchema
  | FilterSidebarDisclosureGroupSchema

interface FilterSidebarSchemaRendererProps {
  groups: FilterSidebarGroupSchema[]
}

function renderField(field: FilterSidebarFieldSchema) {
  switch (field.kind) {
    case 'search':
      return (
        <FilterSearchField
          key={field.id}
          label={field.label}
          value={field.value}
          onChange={field.onChange}
          {...(field.hint !== undefined ? { hint: field.hint } : {})}
          {...(field.placeholder !== undefined ? { placeholder: field.placeholder } : {})}
          {...(field.className !== undefined ? { className: field.className } : {})}
          {...(field.type !== undefined ? { type: field.type } : {})}
        />
      )
    case 'segmented':
      return (
        <FilterSegmentedField
          key={field.id}
          label={field.label}
          value={field.value}
          options={field.options}
          onChange={field.onChange}
          groupLabel={field.groupLabel}
          {...(field.hint !== undefined ? { hint: field.hint } : {})}
          {...(field.className !== undefined ? { className: field.className } : {})}
        />
      )
    case 'select':
      return (
        <FilterSingleSelectField
          key={field.id}
          label={field.label}
          value={field.value}
          options={field.options}
          onChange={field.onChange}
          {...(field.hint !== undefined ? { hint: field.hint } : {})}
          {...(field.className !== undefined ? { className: field.className } : {})}
        />
      )
    case 'chip-single':
      return (
        <FilterChipSingleSelectField
          key={field.id}
          label={field.label}
          value={field.value}
          options={field.options}
          onChange={field.onChange}
          groupLabel={field.groupLabel}
          {...(field.hint !== undefined ? { hint: field.hint } : {})}
          {...(field.className !== undefined ? { className: field.className } : {})}
        />
      )
    case 'chip-multi':
      return (
        <FilterChipMultiSelectField
          key={field.id}
          label={field.label}
          options={field.options}
          selectedValues={field.selectedValues}
          onReset={field.onReset}
          onToggle={field.onToggle}
          allLabel={field.allLabel}
          {...(field.hint !== undefined ? { hint: field.hint } : {})}
          {...(field.className !== undefined ? { className: field.className } : {})}
        />
      )
    case 'custom':
      return <Fragment key={field.id}>{field.render()}</Fragment>
  }
}

export function FilterSidebarSchemaRenderer({
  groups,
}: FilterSidebarSchemaRendererProps) {
  return (
    <>
      {groups.map((group) => {
        if (group.kind === 'plain') {
          return (
            <Fragment key={group.id}>
              {group.label != null ? (
                <div className="filter-sidebar-panel__section-label">{group.label}</div>
              ) : null}
              <div className="filter-panel filter-panel--sidebar">
                {group.fields.map(renderField)}
              </div>
            </Fragment>
          )
        }

        return (
          <Fragment key={group.id}>
            {group.label != null ? (
              <div className="filter-sidebar-panel__section-label filter-sidebar-panel__section-label--subtle">
                {group.label}
              </div>
            ) : null}
            <div className="filter-disclosure-stack">
              {group.sections.map((section) => (
                <FilterDisclosureSection
                  key={section.id}
                  title={section.title}
                  summary={section.summary}
                  status={section.status}
                  isExpanded={section.isExpanded}
                  onToggle={section.onToggle}
                >
                  <div className="filter-panel filter-panel--nested">
                    {section.fields.map(renderField)}
                  </div>
                </FilterDisclosureSection>
              ))}
            </div>
          </Fragment>
        )
      })}
    </>
  )
}
