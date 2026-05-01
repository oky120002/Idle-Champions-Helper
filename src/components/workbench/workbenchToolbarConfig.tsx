import type { ReactNode } from 'react'
import {
  WorkbenchToolbarCopy,
  WorkbenchToolbarFilterStatus,
  WorkbenchToolbarMark,
  type WorkbenchAccentTone,
} from './WorkbenchScaffold'
import { WorkbenchToolbarItems, type WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'

export interface WorkbenchToolbarMarkConfig {
  kind: 'mark'
  label: string
  accentTone?: WorkbenchAccentTone
}

export interface WorkbenchToolbarFilterStatusConfig {
  kind: 'filter-status'
  label: string
  activeCount: number
  accentTone?: WorkbenchAccentTone
}

export interface WorkbenchToolbarCopyConfig {
  kind: 'copy'
  kicker?: ReactNode
  title: ReactNode
  detail?: ReactNode
}

export interface WorkbenchToolbarItemsConfig {
  kind: 'items'
  items: WorkbenchToolbarItemConfig[]
  layout?: 'inline' | 'cluster'
}

export interface WorkbenchToolbarNodeConfig {
  kind: 'node'
  node: ReactNode
}

export interface WorkbenchToolbarConfig {
  lead?: WorkbenchToolbarMarkConfig | WorkbenchToolbarFilterStatusConfig | WorkbenchToolbarNodeConfig
  primary?: WorkbenchToolbarCopyConfig | WorkbenchToolbarItemsConfig | WorkbenchToolbarNodeConfig
  actions?: WorkbenchToolbarItemsConfig | WorkbenchToolbarNodeConfig
}

export function renderWorkbenchToolbarSection(
  config: WorkbenchToolbarConfig['lead'] | WorkbenchToolbarConfig['primary'] | WorkbenchToolbarConfig['actions'] | undefined,
): ReactNode {
  if (config === undefined) {
    return null
  }

  if (config.kind === 'node') {
    return config.node
  }

  if (config.kind === 'mark') {
    return (
      <WorkbenchToolbarMark
        label={config.label}
        {...(config.accentTone !== undefined ? { accentTone: config.accentTone } : {})}
      />
    )
  }

  if (config.kind === 'filter-status') {
    return (
      <WorkbenchToolbarFilterStatus
        label={config.label}
        activeCount={config.activeCount}
        {...(config.accentTone !== undefined ? { accentTone: config.accentTone } : {})}
      />
    )
  }

  if (config.kind === 'copy') {
    return (
      <WorkbenchToolbarCopy
        {...(config.kicker !== undefined ? { kicker: config.kicker } : {})}
        title={config.title}
        {...(config.detail !== undefined ? { detail: config.detail } : {})}
      />
    )
  }

  return (
    <WorkbenchToolbarItems
      items={config.items}
      layout={config.layout ?? 'inline'}
    />
  )
}
