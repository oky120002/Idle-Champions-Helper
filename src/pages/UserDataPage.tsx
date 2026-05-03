import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import {
  WorkbenchContentStack,
} from '../components/workbench/WorkbenchScaffold'
import {
  type WorkbenchToolbarItemConfig,
} from '../components/workbench/WorkbenchToolbarItems'
import {
  createWorkbenchBadgeItem,
  createWorkbenchShareItem,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { SurfaceCardContentSections, type SurfaceCardContentSection } from '../components/SurfaceCardContentSections'
import { UserDataWorkbench } from './user-data/UserDataWorkbench'
import { UserSyncPanel } from './user-data/UserSyncPanel'
import { useUserDataPageModel } from './user-data/useUserDataPageModel'

export function UserDataPage() {
  const model = useUserDataPageModel()
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchBadgeItem({
      id: 'selected-method',
      label: model.selectedMethod.label,
    }),
    createWorkbenchBadgeItem({
      id: 'parse-status',
      tone: 'muted',
      label: model.parseState.status === 'success'
        ? model.t({ zh: '解析成功', en: 'Parsed' })
        : model.parseState.status === 'error'
          ? model.t({ zh: '需要修正', en: 'Needs fixes' })
          : model.t({ zh: '等待输入', en: 'Waiting for input' }),
    }),
    createWorkbenchShareItem({
      t: model.t,
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]
  const importBoundarySections: SurfaceCardContentSection[] = [
    {
      id: 'supported-foundations',
      title: model.t({ zh: '当前已经支持的骨架', en: 'What already exists' }),
      items: [
        {
          id: 'support-url',
          content: model.t({ zh: 'Support URL 本地解析', en: 'Local Support URL parsing' }),
        },
        {
          id: 'manual-input',
          content: model.t({ zh: '手动输入 User ID + Hash 校验', en: 'Manual User ID + Hash validation' }),
        },
        {
          id: 'log-extract',
          content: model.t({ zh: '日志文本提取 user_id / hash', en: 'Extracting user_id / hash from log text' }),
        },
        {
          id: 'masked-preview',
          content: model.t({ zh: '脱敏预览结果展示', en: 'Masked preview output' }),
        },
      ],
    },
    {
      id: 'explicit-boundaries',
      title: model.t({ zh: '当前明确不做', en: 'What it explicitly does not do' }),
      items: [
        {
          id: 'no-live-api',
          content: model.t({ zh: '只在点击手动同步时调用官方只读接口', en: 'Only call official read-only endpoints after manual sync' }),
        },
        {
          id: 'no-auto-persist',
          content: model.t({ zh: '不在页面自动持久化敏感凭证', en: 'No automatic persistence of sensitive credentials' }),
        },
        {
          id: 'no-upload',
          content: model.t({ zh: '不上传到你的服务端', en: 'No upload to your server' }),
        },
        {
          id: 'no-background-sync',
          content: model.t({ zh: '不做隐式后台同步', en: 'No implicit background sync' }),
        },
      ],
    },
  ]
  const nextStageSections: SurfaceCardContentSection[] = [
    {
      id: 'next-stage-steps',
      listVariant: 'ordered' as const,
      items: [
        {
          id: 'parse-browser',
          content: model.t({ zh: '浏览器里解析 Support URL / 日志文本，拿到 `user_id + hash`', en: 'Parse the Support URL / log text in the browser to get `user_id + hash`' }),
        },
        {
          id: 'expand-inputs',
          content: model.t({ zh: '用户点击手动同步后，浏览器请求官方只读接口，不经过本项目后端', en: 'After manual sync, the browser requests official read-only endpoints without passing through this project backend' }),
        },
        {
          id: 'persist-indexeddb',
          content: model.t({ zh: '把已归一化的个人数据写入 `IndexedDB`，而不是上传到后端', en: 'Write normalized personal data to `IndexedDB` instead of uploading it to a backend' }),
        },
        {
          id: 'consume-locally',
          content: model.t({ zh: '页面再消费本地画像做英雄可用性、拥有状态和阵型建议', en: 'Let the UI consume the local profile for availability, ownership state, and formation suggestions' }),
        },
      ],
    },
  ]
  const parsedCredentials = model.parseState.status === 'success' ? model.parseState.credentials : null

  return (
    <ConfiguredWorkbenchPage
      pageClassName="user-data-page"
      storageKey="user-data"
      ariaLabel={model.t({ zh: '个人数据工作台', en: 'User data workbench' })}
      shellClassName="workbench-page__shell user-data-workbench"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: model.t({ zh: '个人数据内容', en: 'User data pane' }),
            }
          : undefined
      }
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'mark',
              label: 'USER DATA',
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: model.t({ zh: '本地优先', en: 'Local first' }),
              title: model.t({ zh: '个人数据', en: 'User data' }),
              detail: model.t({ zh: '统一管理支持 URL、手填凭证和日志片段导入', en: 'Manage Support URL, manual credentials, and log snippet imports in one place' }),
            },
          },
          {
            region: 'actions',
            section: {
              kind: 'items',
              items: toolbarItems,
            },
          },
        ],
      }}
    >
      <WorkbenchContentStack>
        <SurfaceCardContentSections
          eyebrow={model.t({ zh: '导入边界', en: 'Import boundary' })}
          title={model.t({ zh: '先把本地优先的数据导入骨架搭稳', en: 'Stabilize the local-first import skeleton first' })}
          description={model.t({ zh: '这一页在浏览器内解析凭证，只在你点击手动同步时请求官方只读接口，并把归一化快照保存到本地 IndexedDB。', en: 'This page parses credentials in the browser, calls official read-only endpoints only after manual sync, and stores the normalized snapshot in local IndexedDB.' })}
          sections={importBoundarySections}
          layout="split"
        />
        <UserDataWorkbench model={model} />
        <UserSyncPanel credentials={parsedCredentials} />
        <SurfaceCardContentSections
          eyebrow={model.t({ zh: '本地画像', en: 'Local profile' })}
          title={model.t({
            zh: '同步后的数据只留在当前浏览器',
            en: 'Synced data stays in this browser',
          })}
          description={model.t({
            zh: '自动计划器后续只读取本地快照和公开游戏基座数据。页面不会自动刷新，也不会把凭证保存到后端。',
            en: 'The planner will read only the local snapshot and public game data. The page will not auto-refresh or save credentials to a backend.',
          })}
          sections={nextStageSections}
        />
      </WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )
}
