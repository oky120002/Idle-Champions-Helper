import type { ReactNode } from 'react'

export interface PageHeaderMetricItem {
  label: string
  value: ReactNode
}

interface PageHeaderMetricsProps {
  items: PageHeaderMetricItem[]
  className?: string
  variant?: 'default' | 'compact'
}

export function PageHeaderMetrics({ items, className, variant = 'default' }: PageHeaderMetricsProps) {
  if (items.length === 0) {
    return null
  }

  const classes = ['page-header-metrics', variant === 'compact' ? 'page-header-metrics--compact' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {items.map((item) => (
        <article key={item.label} className="page-header-metric">
          <span className="page-header-metric__label">{item.label}</span>
          <strong className="page-header-metric__value">{item.value}</strong>
        </article>
      ))}
    </div>
  )
}
