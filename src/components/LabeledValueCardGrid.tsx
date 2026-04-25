import type { ReactNode } from 'react'

export interface LabeledValueCardItem {
  id: string
  label: ReactNode
  value: ReactNode
  cardClassName?: string
  valueClassName?: string
}

interface LabeledValueCardGridProps {
  items: LabeledValueCardItem[]
  gridClassName: string
  cardClassName: string
  labelClassName: string
  valueClassName: string
}

function joinClasses(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

export function LabeledValueCardGrid({
  items,
  gridClassName,
  cardClassName,
  labelClassName,
  valueClassName,
}: LabeledValueCardGridProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={gridClassName}>
      {items.map((item) => (
        <article key={item.id} className={joinClasses(cardClassName, item.cardClassName)}>
          <span className={labelClassName}>{item.label}</span>
          <strong className={joinClasses(valueClassName, item.valueClassName)}>{item.value}</strong>
        </article>
      ))}
    </div>
  )
}
