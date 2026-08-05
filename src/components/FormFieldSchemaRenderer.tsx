import type { HTMLInputTypeAttribute, InputHTMLAttributes, ReactNode } from 'react'
import { Search } from 'lucide-react'
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
  readonly fields: FormFieldSchema[]
  readonly className?: string
}

function renderGroupField(field: FormFieldGroupSchema): ReactNode | null {
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

function renderChipSingleField(field: FormFieldChipSingleSchema): ReactNode {
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

function renderTextareaField(field: FormFieldTextareaSchema): ReactNode {
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
        onChange={(event) => {
          field.onChange(event.target.value)
        }}
      />
    </FieldGroup>
  )
}

function renderInputField(field: FormFieldInputSchema): ReactNode {
  const isSearch = field.type === 'search'
  const input = (
    <input
      id={field.inputId}
      className={field.inputClassName ?? (isSearch ? 'text-input text-input--with-leading-icon' : 'text-input')}
      type={field.type ?? 'text'}
      value={field.value}
      {...(field.placeholder !== undefined ? { placeholder: field.placeholder } : {})}
      {...(field.inputMode !== undefined ? { inputMode: field.inputMode } : {})}
      onChange={(event) => {
        field.onChange(event.target.value)
      }}
    />
  )

  return (
    <FieldGroup
      key={field.id}
      label={field.label}
      labelFor={field.inputId}
      {...(field.hint !== undefined ? { hint: field.hint } : {})}
      {...(field.className !== undefined ? { className: field.className } : {})}
    >
      {isSearch ? (
        <span className="text-input-shell text-input-shell--search">
          <Search className="text-input-shell__icon" aria-hidden="true" strokeWidth={1.8} />
          {input}
        </span>
      ) : input}
    </FieldGroup>
  )
}

function renderField(field: FormFieldSchema): ReactNode | null {
  if (field.hidden === true) {
    return null
  }

  if (field.kind === 'group') {
    return renderGroupField(field)
  }

  if (field.kind === 'chip-single') {
    return renderChipSingleField(field)
  }

  if (field.kind === 'textarea') {
    return renderTextareaField(field)
  }

  return renderInputField(field)
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
