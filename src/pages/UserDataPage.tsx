/* eslint-disable max-lines -- 单一内聚页面组件，拆分将降低一跳命中率 */
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
  let parseStatusLabel: string
  if (model.parseState.status === 'success') {
    parseStatusLabel = model.t("解析成功")
  } else if (model.parseState.status === 'error') {
    parseStatusLabel = model.t("需要修正")
  } else {
    parseStatusLabel = model.t("等待输入")
  }
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchBadgeItem({
      id: 'selected-method',
      label: model.selectedMethod.label,
    }),
    createWorkbenchBadgeItem({
      id: 'parse-status',
      tone: 'muted',
      label: parseStatusLabel,
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
      title: model.t("当前已经支持的骨架"),
      items: [
        {
          id: 'support-url',
          content: model.t("Support URL 本地解析"),
        },
        {
          id: 'manual-input',
          content: model.t("手动输入 User ID + Hash 校验"),
        },
        {
          id: 'log-extract',
          content: model.t("日志文本提取 user_id / hash"),
        },
        {
          id: 'masked-preview',
          content: model.t("脱敏预览结果展示"),
        },
      ],
    },
    {
      id: 'explicit-boundaries',
      title: model.t("当前明确不做"),
      items: [
        {
          id: 'no-live-api',
          content: model.t("只在点击手动同步时调用官方只读接口"),
        },
        {
          id: 'no-auto-persist',
          content: model.t("不在页面自动持久化敏感凭证"),
        },
        {
          id: 'no-upload',
          content: model.t("不上传到你的服务端"),
        },
        {
          id: 'no-background-sync',
          content: model.t("不做隐式后台同步"),
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
          content: model.t("浏览器里解析 Support URL / 日志文本，拿到 `user_id + hash`"),
        },
        {
          id: 'expand-inputs',
          content: model.t("用户点击手动同步后，浏览器请求官方只读接口，不经过本项目后端"),
        },
        {
          id: 'persist-indexeddb',
          content: model.t("把已归一化的个人数据写入 `IndexedDB`，而不是上传到后端"),
        },
        {
          id: 'consume-locally',
          content: model.t("页面再消费本地画像做英雄可用性、拥有状态和阵型建议"),
        },
      ],
    },
  ]
  const parsedCredentials = model.parseState.status === 'success' ? model.parseState.credentials : null

  return (
    <ConfiguredWorkbenchPage
      pageClassName="user-data-page"
      storageKey="user-data"
      ariaLabel={model.t("个人数据工作台")}
      shellClassName="workbench-page__shell user-data-workbench"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: model.t("个人数据内容"),
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
              kicker: model.t("本地优先"),
              title: model.t("个人数据"),
              detail: model.t("统一管理支持 URL、手填凭证和日志片段导入"),
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
          eyebrow={model.t("导入边界")}
          title={model.t("先把本地优先的数据导入骨架搭稳")}
          description={model.t("这一页在浏览器内解析凭证，只在你点击手动同步时请求官方只读接口，并把浏览器同步快照保存到本地 IndexedDB；开发私有快照则通过单独来源显式切换。")}
          sections={importBoundarySections}
          layout="split"
        />
        <UserDataWorkbench model={model} />
        <UserSyncPanel credentials={parsedCredentials} />
        <SurfaceCardContentSections
          eyebrow={model.t("本地画像")}
          title={model.t("同步后的数据只留在当前浏览器")}
          description={model.t("自动计划器后续只读取当前选中的本地画像来源和公开游戏基座数据。页面不会自动刷新，也不会把凭证保存到后端。")}
          sections={nextStageSections}
        />
      </WorkbenchContentStack>
    </ConfiguredWorkbenchPage>
  )
}
