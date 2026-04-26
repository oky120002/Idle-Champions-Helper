import { useLayoutEffect, useRef, type ReactNode } from 'react'
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

function getVisibleInlineWidth(element: HTMLElement): number {
  const scrollParent = element.closest('.page-workbench__content-scroll')

  if (!(scrollParent instanceof HTMLElement)) {
    return element.clientWidth
  }

  const elementRect = element.getBoundingClientRect()
  const parentRect = scrollParent.getBoundingClientRect()
  const scrollbarInset = scrollParent.offsetWidth - scrollParent.clientWidth
  const visibleRight = parentRect.right - Math.max(0, scrollbarInset) - 24

  return Math.max(0, Math.floor(Math.min(elementRect.right, visibleRight) - elementRect.left))
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
  const metricsFitRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const element = metricsFitRef.current

    if (element === null) {
      return
    }

    const MIN_SCALE = 0.5
    let currentScale = 1

    const applyScale = () => {
      const target = metricsFitRef.current

      if (target === null) {
        return
      }

      const metricsRow = target.querySelector('.page-header-metrics')

      if (!(metricsRow instanceof HTMLElement)) {
        return
      }

      target.style.setProperty('--workbench-metrics-scale', '1')

      const availableWidth = getVisibleInlineWidth(target)
      const naturalWidth = metricsRow.getBoundingClientRect().width

      if (availableWidth <= 0 || naturalWidth <= availableWidth) {
        if (currentScale !== 1) {
          currentScale = 1
          target.style.setProperty('--workbench-metrics-scale', '1')
        }

        return
      }

      const nextScale = Math.max(MIN_SCALE, (availableWidth / naturalWidth) * 0.985)

      if (Math.abs(nextScale - currentScale) < 0.01) {
        return
      }

      currentScale = nextScale
      target.style.setProperty('--workbench-metrics-scale', `${nextScale}`)
    }

    applyScale()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId: number | null = null
    const scheduleScale = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        applyScale()
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleScale()
    })
    resizeObserver.observe(element)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      resizeObserver.disconnect()
    }
  }, [items, filterSummary, className])

  return (
    <WorkbenchFilterResultsHeader
      metrics={items.length > 0 ? (
        <div ref={metricsFitRef} className="workbench-filter-header__metrics-fit">
          <PageHeaderMetrics items={items} variant="compact" />
        </div>
      ) : null}
      reserveFilterSummarySpace={filterSummaryPrefix !== undefined}
      {...(eyebrow !== undefined ? { eyebrow } : {})}
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(filterSummary !== undefined ? { filterSummary } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  )
}
