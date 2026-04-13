import type { ReactNode } from 'react'

interface FieldGroupProps {
  label: ReactNode
  children: ReactNode
  hint?: ReactNode
  as?: 'div' | 'label'
  className?: string
  labelFor?: string
}

export function FieldGroup({
  label,
  children,
  hint,
  as = 'div',
  className = 'form-field',
  labelFor,
}: FieldGroupProps) {
  if (as === 'label') {
    return (
      <label className={className}>
        <span className="field-label">{label}</span>
        {children}
        {hint !== undefined ? <span className="field-hint">{hint}</span> : null}
      </label>
    )
  }

  return (
    <div className={className}>
      {labelFor !== undefined ? (
        <label className="field-label" htmlFor={labelFor}>
          {label}
        </label>
      ) : (
        <span className="field-label">{label}</span>
      )}
      {children}
      {hint !== undefined ? <span className="field-hint">{hint}</span> : null}
    </div>
  )
}
