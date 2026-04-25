import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import {
  WorkbenchContentStack,
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
  WorkbenchToolbarBadge,
  WorkbenchToolbarCopy,
  WorkbenchToolbarMark,
} from '../components/workbench/WorkbenchScaffold'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import {
  WorkbenchToolbarItems,
  type WorkbenchToolbarItemConfig,
} from '../components/workbench/WorkbenchToolbarItems'
import {
  createWorkbenchBadgeItem,
  createWorkbenchShareItem,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { StatusBannerStack } from '../components/StatusBannerStack'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { FormationBoardEditor } from './formation/FormationBoardEditor'
import { FormationDraftBanner } from './formation/FormationDraftBanner'
import { FormationLayoutFilters } from './formation/FormationLayoutFilters'
import { FormationPresetCard } from './formation/FormationPresetCard'
import { useFormationPageModel } from './formation/useFormationPageModel'

export function FormationPage() {
  const model = useFormationPageModel()
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const activeSidebarFilterCount = (model.layoutSearch.trim() ? 1 : 0) + (model.selectedContextKind === 'all' ? 0 : 1)
  const contentStatusItems = createAsyncStatusBannerItems({
    status: model.state.status,
    loading: {
      children: model.t({ zh: '正在读取阵型布局和英雄数据…', en: 'Loading layouts and champion data…' }),
    },
    error: {
      title: model.t({ zh: '阵型数据读取失败', en: 'Formation data failed to load' }),
      ...(model.state.status === 'error' ? { detail: model.state.message } : {}),
    },
  })
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchBadgeItem({
      id: 'selected-layout',
      label: model.selectedLayoutLabel ?? model.t({ zh: '未选择布局', en: 'No layout selected' }),
    }),
    createWorkbenchBadgeItem({
      id: 'placed-count',
      tone: 'muted',
      label: model.t({ zh: `${model.selectedChampions.length} 名已放置`, en: `${model.selectedChampions.length} placed` }),
    }),
    createWorkbenchShareItem({
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]

  return (
    <div className="formation-page workbench-page">
      <PageWorkbenchShell
        storageKey="formation"
        ariaLabel={model.t({ zh: '阵型编辑工作台', en: 'Formation workbench' })}
        className="workbench-page__shell formation-workbench"
        contentScrollRef={contentScrollRef}
        contentOverlay={
          showScrollTop ? (
            <WorkbenchFloatingTopButton
              onClick={scrollToTop}
              detailLabel={model.t({ zh: '阵型内容', en: 'Formation pane' })}
            />
          ) : null
        }
        toolbarLead={<WorkbenchToolbarMark label="FORMATION" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={model.t({ zh: '战术工作台', en: 'Tactical workbench' })}
            title={model.t({ zh: '阵型编辑', en: 'Formation editor' })}
            detail={model.t({ zh: '左侧筛选布局，右侧编辑当前阵型与方案摘要', en: 'Filter layouts on the left, edit the board and preset summary on the right' })}
          />
        )}
        toolbarActions={<WorkbenchToolbarItems items={toolbarItems} />}
        sidebarHeader={
          model.state.status === 'ready' ? (
            <WorkbenchSidebarHeader
              kicker={model.t({ zh: '布局抽屉', en: 'Layout drawer' })}
              title={model.t({ zh: '先锁场景，再挑当前画板', en: 'Choose the scenario before the board' })}
              description={model.t({ zh: '左侧持续保留布局搜索、场景类型与当前布局摘要，右侧只专注当前阵型编辑。', en: 'Keep layout search, scenario type, and the selected board summary on the left so the right side stays focused on editing.' })}
              statusLabel={model.t({ zh: '布局筛选状态', en: 'Layout filter status' })}
              status={(
                <WorkbenchToolbarBadge>
                  {activeSidebarFilterCount > 0
                    ? model.t({ zh: `${activeSidebarFilterCount} 项条件`, en: `${activeSidebarFilterCount} active` })
                    : model.t({ zh: '布局筛选待命', en: 'Filters idle' })}
                </WorkbenchToolbarBadge>
              )}
            />
          ) : null
        }
        sidebar={
          model.state.status === 'ready' ? (
            <FormationLayoutFilters model={model} />
          ) : (
            <WorkbenchSidebarLoading />
          )
        }
        contentHeader={model.state.status === 'ready' ? <FormationDraftBanner model={model} /> : null}
      >
        <StatusBannerStack items={contentStatusItems} />

        {model.state.status === 'ready' ? (
          <WorkbenchContentStack>
            <FormationBoardEditor model={model} />
            <FormationPresetCard model={model} />
          </WorkbenchContentStack>
        ) : null}
      </PageWorkbenchShell>
    </div>
  )
}
