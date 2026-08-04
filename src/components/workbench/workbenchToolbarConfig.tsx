import { Fragment, type ReactNode } from 'react'
import {
  WorkbenchToolbarCopy,
  WorkbenchToolbarFilterStatus,
  WorkbenchToolbarMark,
} from './WorkbenchToolbarPrimitives'
import type { WorkbenchAccentTone } from './WorkbenchScaffold'
import { WorkbenchToolbarItems, type WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'
import { WorkbenchToolbarTabList } from './WorkbenchToolbarTabList'

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

export interface WorkbenchToolbarGroupConfig {
  kind: 'group'
  items: WorkbenchToolbarSectionConfig[]
  className?: string
}

export interface WorkbenchToolbarTabListItemConfig {
  id: string
  label: ReactNode
  controlsId?: string
}

export interface WorkbenchToolbarTabListConfig {
  kind: 'tablist'
  value: string
  items: WorkbenchToolbarTabListItemConfig[]
  ariaLabel: string
  onChange: (value: string) => void
}

export interface WorkbenchToolbarNodeConfig {
  kind: 'node'
  node: ReactNode
}

export type WorkbenchToolbarSectionConfig =
  | WorkbenchToolbarMarkConfig
  | WorkbenchToolbarFilterStatusConfig
  | WorkbenchToolbarCopyConfig
  | WorkbenchToolbarItemsConfig
  | WorkbenchToolbarTabListConfig
  | WorkbenchToolbarNodeConfig
  | WorkbenchToolbarGroupConfig

export type WorkbenchToolbarRegion = 'lead' | 'primary' | 'actions'

export interface WorkbenchToolbarPlacementConfig {
  region: WorkbenchToolbarRegion
  section: WorkbenchToolbarSectionConfig
}

export interface WorkbenchToolbarConfig {
  sections: WorkbenchToolbarPlacementConfig[]
}

function joinClasses(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

function renderToolbarGroup(config: WorkbenchToolbarGroupConfig, slot: WorkbenchToolbarRegion): ReactNode {
  return (
    <div className={joinClasses('workbench-page__toolbar-group', `workbench-page__toolbar-group--${slot}`, config.className)}>
      {config.items.map((item, index) => (
        <Fragment key={`${slot}-${index}`}>
          {renderWorkbenchToolbarSection(item, slot)}
        </Fragment>
      ))}
    </div>
  )
}

export function renderWorkbenchToolbarSection(
  config: WorkbenchToolbarSectionConfig | undefined,
  slot: WorkbenchToolbarRegion = 'primary',
): ReactNode {
  if (config === undefined) {
    return null
  }

  switch (config.kind) {
    case 'group':
      return renderToolbarGroup(config, slot)
    case 'node':
      return config.node
    case 'mark':
      return (
        <WorkbenchToolbarMark
          label={config.label}
          {...(config.accentTone !== undefined ? { accentTone: config.accentTone } : {})}
        />
      )
    case 'filter-status':
      return (
        <WorkbenchToolbarFilterStatus
          label={config.label}
          activeCount={config.activeCount}
          {...(config.accentTone !== undefined ? { accentTone: config.accentTone } : {})}
        />
      )
    case 'copy':
      return (
        <WorkbenchToolbarCopy
          {...(config.kicker !== undefined ? { kicker: config.kicker } : {})}
          title={config.title}
          {...(config.detail !== undefined ? { detail: config.detail } : {})}
        />
      )
    case 'tablist':
      return (
        <WorkbenchToolbarTabList
          value={config.value}
          items={config.items}
          ariaLabel={config.ariaLabel}
          onChange={config.onChange}
        />
      )
    default:
      return (
        <WorkbenchToolbarItems
          items={config.items}
          layout={config.layout ?? 'inline'}
        />
      )
  }
}

export function resolveWorkbenchToolbarSlotConfig(
  toolbar: WorkbenchToolbarConfig,
  region: WorkbenchToolbarRegion,
): WorkbenchToolbarSectionConfig | undefined {
  const placements = toolbar.sections.filter((item) => item.region === region).map((item) => item.section)

  if (placements.length === 1) {
    return placements[0]
  }

  if (placements.length > 1) {
    return {
      kind: 'group',
      items: placements,
    }
  }
  return undefined
}
