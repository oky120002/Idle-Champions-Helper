import type { ReactNode } from 'react'
import { PageHeaderMetrics, type PageHeaderMetricItem } from '../PageHeaderMetrics'
import { WorkbenchFilterResultsHeader } from './WorkbenchScaffold'

interface WorkbenchFilterMetricsHeaderProps {
  items: PageHeaderMetricItem[]
  activeFilters?: string[]
  filterSummaryPrefix?: string
  eyebrow?: string
  title?: ReactNode
  description?: ReactNode
  className?: string
}

export function WorkbenchFilterMetricsHeader({
  items,
  activeFilters = [],
  filterSummaryPrefix,
  eyebrow,
  title,
  description,
  className,
}: WorkbenchFilterMetricsHeaderProps) {
  const filterSummary =
    filterSummaryPrefix !== undefined && activeFilters.length > 0
      ? `${filterSummaryPrefix}${activeFilters.join(' · ')}`
      : undefined

  return (
    <WorkbenchFilterResultsHeader
      metrics={items.length > 0 ? <PageHeaderMetrics items={items} variant="compact" /> : null}
      reserveFilterSummarySpace={filterSummaryPrefix !== undefined}
      {...(eyebrow !== undefined ? { eyebrow } : {})}
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(filterSummary !== undefined ? { filterSummary } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  )
}
