import type { HTMLInputTypeAttribute, InputHTMLAttributes, ReactNode } from 'react'
import { FieldGroup } from './FieldGroup'
import { FilterChipSingleSelectField } from './filter-sidebar/FilterChipSingleSelectField'

type FormFieldGroupLayout = 'stack' | 'split'

interface FormFieldBase {
  id: string
  hidden?: boolean
}

interface FormFieldInputSchema extends FormFieldBase {
  kind: 'input'
  inputId: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  placeholder?: string
  type?: HTMLInputTypeAttribute
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  className?: string
  inputClassName?: string
}

interface FormFieldTextareaSchema extends FormFieldBase {
  kind: 'textarea'
  inputId: string
  label: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  placeholder?: string
  rows?: number
  className?: string
  inputClassName?: string
}

interface FormFieldChipSingleOption {
  value: string
  label: ReactNode
  count?: number
}

interface FormFieldChipSingleSchema extends FormFieldBase {
  kind: 'chip-single'
  label: ReactNode
  value: string
  onChange: (value: string) => void
  groupLabel: string
  hint?: ReactNode
  options: FormFieldChipSingleOption[]
  className?: string
}

interface FormFieldGroupSchema extends FormFieldBase {
  kind: 'group'
  layout?: FormFieldGroupLayout
  fields: FormFieldSchema[]
  className?: string
}

export type FormFieldSchema =
  | FormFieldInputSchema
  | FormFieldTextareaSchema
  | FormFieldChipSingleSchema
  | FormFieldGroupSchema

interface FormFieldSchemaRendererProps {
  fields: FormFieldSchema[]
  className?: string
}

function renderField(field: FormFieldSchema): ReactNode | null {
  if (field.hidden) {
    return null
  }

  if (field.kind === 'group') {
    const childNodes = field.fields
      .map((childField) => renderField(childField))
      .filter((child): child is Exclude<ReactNode, null> => child !== null)

    if (childNodes.length === 0) {
      return null
    }

    const groupClassName = [
      field.layout === 'split' ? 'split-grid' : 'form-stack',
      field.className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div key={field.id} className={groupClassName}>
        {childNodes}
      </div>
    )
  }

  if (field.kind === 'chip-single') {
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
  }

  if (field.kind === 'textarea') {
    return (
      <FieldGroup
        key={field.id}
        label={field.label}
        labelFor={field.inputId}
        {...(field.hint !== undefined ? { hint: field.hint } : {})}
        {...(field.className !== undefined ? { className: field.className } : {})}
      >
        <textarea
          id={field.inputId}
          className={field.inputClassName ?? 'text-area'}
          rows={field.rows ?? 4}
          value={field.value}
          {...(field.placeholder !== undefined ? { placeholder: field.placeholder } : {})}
          onChange={(event) => field.onChange(event.target.value)}
        />
      </FieldGroup>
    )
  }

  return (
    <FieldGroup
      key={field.id}
      label={field.label}
      labelFor={field.inputId}
      {...(field.hint !== undefined ? { hint: field.hint } : {})}
      {...(field.className !== undefined ? { className: field.className } : {})}
    >
      <input
        id={field.inputId}
        className={field.inputClassName ?? 'text-input'}
        type={field.type ?? 'text'}
        value={field.value}
        {...(field.placeholder !== undefined ? { placeholder: field.placeholder } : {})}
        {...(field.inputMode !== undefined ? { inputMode: field.inputMode } : {})}
        onChange={(event) => field.onChange(event.target.value)}
      />
    </FieldGroup>
  )
}

export function FormFieldSchemaRenderer({ fields, className }: FormFieldSchemaRendererProps) {
  const nodes = fields
    .map((field) => renderField(field))
    .filter((node): node is Exclude<ReactNode, null> => node !== null)

  if (nodes.length === 0) {
    return null
  }

  return <div className={className}>{nodes}</div>
}
