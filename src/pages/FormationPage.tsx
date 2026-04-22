import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { StatusBanner } from '../components/StatusBanner'
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
  const shareButtonLabel =
    shareLinkState === 'success'
      ? model.t({ zh: '链接已复制', en: 'Link copied' })
      : shareLinkState === 'error'
        ? model.t({ zh: '复制失败', en: 'Copy failed' })
        : model.t({ zh: '复制当前链接', en: 'Copy current link' })
  const activeSidebarFilterCount = (model.layoutSearch.trim() ? 1 : 0) + (model.selectedContextKind === 'all' ? 0 : 1)

  return (
    <div className="formation-page formation-page--workbench">
      <PageWorkbenchShell
        storageKey="formation"
        ariaLabel={model.t({ zh: '阵型编辑工作台', en: 'Formation workbench' })}
        className="formation-workbench"
        contentScrollRef={contentScrollRef}
        contentOverlay={
          showScrollTop ? (
            <WorkbenchFloatingTopButton
              onClick={scrollToTop}
              detailLabel={model.t({ zh: '阵型内容', en: 'Formation pane' })}
            />
          ) : null
        }
        toolbarLead={(
          <div className="formation-workbench__toolbar-mark" aria-hidden="true">
            <span className="formation-workbench__toolbar-mark-dot" />
            <span className="formation-workbench__toolbar-mark-label">FORMATION</span>
          </div>
        )}
        toolbarPrimary={(
          <div className="formation-workbench__toolbar-copy">
            <span className="formation-workbench__toolbar-kicker">
              {model.t({ zh: '战术工作台', en: 'Tactical workbench' })}
            </span>
            <strong className="formation-workbench__toolbar-title">
              {model.t({ zh: '阵型编辑', en: 'Formation editor' })}
            </strong>
            <span className="formation-workbench__toolbar-detail">
              {model.t({ zh: '左侧筛选布局，右侧编辑当前阵型与方案摘要', en: 'Filter layouts on the left, edit the board and preset summary on the right' })}
            </span>
          </div>
        )}
        toolbarActions={(
          <>
            <span className="formation-workbench__toolbar-badge">
              {model.selectedLayoutLabel ?? model.t({ zh: '未选择布局', en: 'No layout selected' })}
            </span>
            <span className="formation-workbench__toolbar-badge formation-workbench__toolbar-badge--muted">
              {model.t({ zh: `${model.selectedChampions.length} 名已放置`, en: `${model.selectedChampions.length} placed` })}
            </span>
            <button
              type="button"
              className={
                shareLinkState === 'success'
                  ? 'action-button action-button--ghost action-button--compact action-button--toggled'
                  : 'action-button action-button--ghost action-button--compact'
              }
              onClick={() => {
                void copyCurrentLink()
              }}
            >
              {shareButtonLabel}
            </button>
          </>
        )}
        sidebarHeader={
          model.state.status === 'ready' ? (
            <div className="formation-workbench__sidebar-header">
              <div className="formation-workbench__sidebar-copy">
                <p className="formation-workbench__sidebar-kicker">{model.t({ zh: '布局抽屉', en: 'Layout drawer' })}</p>
                <h3 className="formation-workbench__sidebar-title">
                  {model.t({ zh: '先锁场景，再挑当前画板', en: 'Choose the scenario before the board' })}
                </h3>
                <p className="formation-workbench__sidebar-description">
                  {model.t({ zh: '左侧持续保留布局搜索、场景类型与当前布局摘要，右侧只专注当前阵型编辑。', en: 'Keep layout search, scenario type, and the selected board summary on the left so the right side stays focused on editing.' })}
                </p>
              </div>
              <div className="formation-workbench__sidebar-status" role="group" aria-label={model.t({ zh: '布局筛选状态', en: 'Layout filter status' })}>
                <span className="formation-workbench__toolbar-badge">
                  {activeSidebarFilterCount > 0
                    ? model.t({ zh: `${activeSidebarFilterCount} 项条件`, en: `${activeSidebarFilterCount} active` })
                    : model.t({ zh: '布局筛选待命', en: 'Filters idle' })}
                </span>
              </div>
            </div>
          ) : null
        }
        sidebar={
          model.state.status === 'ready' ? (
            <FormationLayoutFilters model={model} />
          ) : (
            <div className="formation-workbench__sidebar-loading" aria-hidden="true" />
          )
        }
        contentHeader={model.state.status === 'ready' ? <FormationDraftBanner model={model} /> : null}
      >
        {model.state.status === 'loading' ? (
          <StatusBanner tone="info">
            {model.t({ zh: '正在读取阵型布局和英雄数据…', en: 'Loading layouts and champion data…' })}
          </StatusBanner>
        ) : null}

        {model.state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={model.t({ zh: '阵型数据读取失败', en: 'Formation data failed to load' })}
            detail={model.state.message}
          />
        ) : null}

        {model.state.status === 'ready' ? (
          <div className="formation-workbench__content-stack">
            <FormationBoardEditor model={model} />
            <FormationPresetCard model={model} />
          </div>
        ) : null}
      </PageWorkbenchShell>
    </div>
  )
}
