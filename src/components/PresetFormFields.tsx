import { FieldGroup } from './FieldGroup'
import type { PresetPriority } from '../domain/types'

export interface PresetFormFieldValue {
  name: string
  description: string
  scenarioTagsInput: string
  priority: PresetPriority
}

interface PresetFormFieldsProps {
  value: PresetFormFieldValue
  priorityOptions: PresetPriority[]
  nameInputId?: string
  descriptionInputId?: string
  tagsInputId?: string
  namePlaceholder?: string
  descriptionPlaceholder?: string
  tagsPlaceholder?: string
  tagsHint?: string
  nameLabel: string
  descriptionLabel: string
  tagsLabel: string
  priorityLabel: string
  getPriorityOptionLabel: (priority: PresetPriority) => string
  onChange: <K extends keyof PresetFormFieldValue>(
    key: K,
    value: PresetFormFieldValue[K],
  ) => void
  includeStackClass?: boolean
  className?: string
}

export function PresetFormFields({
  value,
  priorityOptions,
  nameInputId,
  descriptionInputId,
  tagsInputId,
  namePlaceholder,
  descriptionPlaceholder,
  tagsPlaceholder,
  tagsHint,
  nameLabel,
  descriptionLabel,
  tagsLabel,
  priorityLabel,
  getPriorityOptionLabel,
  onChange,
  includeStackClass = true,
  className,
}: PresetFormFieldsProps) {
  const formClassName = [includeStackClass ? 'form-stack' : '', className].filter(Boolean).join(' ')

  return (
    <div className={formClassName}>
      <FieldGroup label={nameLabel} {...(nameInputId !== undefined ? { labelFor: nameInputId } : {})}>
        <input
          {...(nameInputId !== undefined ? { id: nameInputId } : {})}
          className="text-input"
          type="text"
          value={value.name}
          {...(namePlaceholder !== undefined ? { placeholder: namePlaceholder } : {})}
          onChange={(event) => onChange('name', event.target.value)}
        />
      </FieldGroup>

      <FieldGroup label={descriptionLabel} {...(descriptionInputId !== undefined ? { labelFor: descriptionInputId } : {})}>
        <textarea
          {...(descriptionInputId !== undefined ? { id: descriptionInputId } : {})}
          className="text-area"
          rows={4}
          value={value.description}
          {...(descriptionPlaceholder !== undefined ? { placeholder: descriptionPlaceholder } : {})}
          onChange={(event) => onChange('description', event.target.value)}
        />
      </FieldGroup>

      <FieldGroup
        label={tagsLabel}
        {...(tagsInputId !== undefined ? { labelFor: tagsInputId } : {})}
        {...(tagsHint !== undefined ? { hint: tagsHint } : {})}
      >
        <input
          {...(tagsInputId !== undefined ? { id: tagsInputId } : {})}
          className="text-input"
          type="text"
          value={value.scenarioTagsInput}
          {...(tagsPlaceholder !== undefined ? { placeholder: tagsPlaceholder } : {})}
          onChange={(event) => onChange('scenarioTagsInput', event.target.value)}
        />
      </FieldGroup>

      <FieldGroup label={priorityLabel}>
        <div className="segmented-control">
          {priorityOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={
                value.priority === option
                  ? 'segmented-control__button segmented-control__button--active'
                  : 'segmented-control__button'
              }
              onClick={() => onChange('priority', option)}
            >
              {getPriorityOptionLabel(option)}
            </button>
          ))}
        </div>
      </FieldGroup>
    </div>
  )
}
