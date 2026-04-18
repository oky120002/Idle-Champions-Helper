import type { ReactNode } from 'react'

export interface PageHeaderMetricItem {
  label: string
  value: ReactNode
}

interface PageHeaderMetricsProps {
  items: PageHeaderMetricItem[]
  className?: string
}

export function PageHeaderMetrics({ items, className }: PageHeaderMetricsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className={className ? `page-header-metrics ${className}` : 'page-header-metrics'}>
      {items.map((item) => (
        <article key={item.label} className="page-header-metric">
          <span className="page-header-metric__label">{item.label}</span>
          <strong className="page-header-metric__value">{item.value}</strong>
        </article>
      ))}
    </div>
  )
}
