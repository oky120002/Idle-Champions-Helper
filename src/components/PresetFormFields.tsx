import type { PresetPriority } from '../domain/types'
import { FieldGroup } from './FieldGroup'
import { SegmentedButtonGroup } from './SegmentedButtonGroup'

export interface PresetFormFieldValue {
  name: string
  description: string
  scenarioTagsInput: string
  priority: PresetPriority
}

interface PresetFormFieldsProps {
  readonly value: PresetFormFieldValue
  readonly priorityOptions: PresetPriority[]
  readonly nameInputId?: string
  readonly descriptionInputId?: string
  readonly tagsInputId?: string
  readonly namePlaceholder?: string
  readonly descriptionPlaceholder?: string
  readonly tagsPlaceholder?: string
  readonly tagsHint?: string
  readonly nameLabel: string
  readonly descriptionLabel: string
  readonly tagsLabel: string
  readonly priorityLabel: string
  readonly getPriorityOptionLabel: (priority: PresetPriority) => string
  readonly onChange: <K extends keyof PresetFormFieldValue>(
    key: K,
    value: PresetFormFieldValue[K],
  ) => void
  readonly includeStackClass?: boolean
  readonly className?: string
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
        <SegmentedButtonGroup
          value={value.priority}
          items={priorityOptions.map((option) => ({
            value: option,
            label: getPriorityOptionLabel(option),
          }))}
          ariaLabel={priorityLabel}
          onChange={(nextPriority) => onChange('priority', nextPriority)}
        />
      </FieldGroup>
    </div>
  )
}
