import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { UserDataIntroCard } from './user-data/UserDataIntroCard'
import { UserDataNextStageCard } from './user-data/UserDataNextStageCard'
import { UserDataWorkbench } from './user-data/UserDataWorkbench'
import { useUserDataPageModel } from './user-data/useUserDataPageModel'

export function UserDataPage() {
  const model = useUserDataPageModel()
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

  return (
    <div className="user-data-page user-data-page--workbench">
      <PageWorkbenchShell
        storageKey="user-data"
        ariaLabel={model.t({ zh: '个人数据工作台', en: 'User data workbench' })}
        className="user-data-workbench"
        contentScrollRef={contentScrollRef}
        contentOverlay={
          showScrollTop ? (
            <WorkbenchFloatingTopButton
              onClick={scrollToTop}
              detailLabel={model.t({ zh: '个人数据内容', en: 'User data pane' })}
            />
          ) : null
        }
        toolbarLead={(
          <div className="user-data-workbench__toolbar-mark" aria-hidden="true">
            <span className="user-data-workbench__toolbar-mark-dot" />
            <span className="user-data-workbench__toolbar-mark-label">USER DATA</span>
          </div>
        )}
        toolbarPrimary={(
          <div className="user-data-workbench__toolbar-copy">
            <span className="user-data-workbench__toolbar-kicker">{model.t({ zh: '本地优先', en: 'Local first' })}</span>
            <strong className="user-data-workbench__toolbar-title">{model.t({ zh: '个人数据', en: 'User data' })}</strong>
            <span className="user-data-workbench__toolbar-detail">
              {model.t({ zh: '统一管理支持 URL、手填凭证和日志片段导入', en: 'Manage Support URL, manual credentials, and log snippet imports in one place' })}
            </span>
          </div>
        )}
        toolbarActions={(
          <>
            <span className="user-data-workbench__toolbar-badge">{model.selectedMethod.label}</span>
            <span className="user-data-workbench__toolbar-badge user-data-workbench__toolbar-badge--muted">
              {model.parseState.status === 'success'
                ? model.t({ zh: '解析成功', en: 'Parsed' })
                : model.parseState.status === 'error'
                  ? model.t({ zh: '需要修正', en: 'Needs fixes' })
                  : model.t({ zh: '等待输入', en: 'Waiting for input' })}
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
      >
        <div className="user-data-workbench__content-stack">
          <UserDataIntroCard model={model} />
          <UserDataWorkbench model={model} />
          <UserDataNextStageCard model={model} />
        </div>
      </PageWorkbenchShell>
    </div>
  )
}
