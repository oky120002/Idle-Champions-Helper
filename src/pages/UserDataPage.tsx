import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import {
  WorkbenchContentStack,
  WorkbenchShareButton,
  WorkbenchToolbarBadge,
  WorkbenchToolbarCopy,
  WorkbenchToolbarMark,
} from '../components/workbench/WorkbenchScaffold'
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

  return (
    <div className="user-data-page workbench-page">
      <PageWorkbenchShell
        storageKey="user-data"
        ariaLabel={model.t({ zh: '个人数据工作台', en: 'User data workbench' })}
        className="workbench-page__shell user-data-workbench"
        contentScrollRef={contentScrollRef}
        contentOverlay={
          showScrollTop ? (
            <WorkbenchFloatingTopButton
              onClick={scrollToTop}
              detailLabel={model.t({ zh: '个人数据内容', en: 'User data pane' })}
            />
          ) : null
        }
        toolbarLead={<WorkbenchToolbarMark label="USER DATA" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={model.t({ zh: '本地优先', en: 'Local first' })}
            title={model.t({ zh: '个人数据', en: 'User data' })}
            detail={model.t({ zh: '统一管理支持 URL、手填凭证和日志片段导入', en: 'Manage Support URL, manual credentials, and log snippet imports in one place' })}
          />
        )}
        toolbarActions={(
          <>
            <WorkbenchToolbarBadge>{model.selectedMethod.label}</WorkbenchToolbarBadge>
            <WorkbenchToolbarBadge tone="muted">
              {model.parseState.status === 'success'
                ? model.t({ zh: '解析成功', en: 'Parsed' })
                : model.parseState.status === 'error'
                  ? model.t({ zh: '需要修正', en: 'Needs fixes' })
                  : model.t({ zh: '等待输入', en: 'Waiting for input' })}
            </WorkbenchToolbarBadge>
            <WorkbenchShareButton state={shareLinkState} onCopy={copyCurrentLink} />
          </>
        )}
      >
        <WorkbenchContentStack>
          <UserDataIntroCard model={model} />
          <UserDataWorkbench model={model} />
          <UserDataNextStageCard model={model} />
        </WorkbenchContentStack>
      </PageWorkbenchShell>
    </div>
  )
}
