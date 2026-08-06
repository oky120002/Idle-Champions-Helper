# workbench 目录说明

全站页面工作台壳层的共享组件与 hook。结构与视觉基线见 `docs/specs/modules/shared-components/page-workbench-design.md`。

## 组件

壳层与包装层：
- `PageWorkbenchShell.tsx` — 唯一页面工作台壳层；合并工具条、左抽屉开合、无左栏模式与桌面双栏内滚。
- `ConfiguredWorkbenchPage.tsx` — 标准工作台包装层；消费 `toolbar` schema 把 mark / primary / actions 收成配置。
- `FilterWorkbenchPage.tsx` — 筛选页包装层；在标准壳层上叠加筛选侧栏与结果区。
- `WorkbenchScaffold.tsx` — 内部稳定展示骨架。

Toolbar：
- `workbenchToolbarConfig.tsx` — `lead / primary / actions` 三区域，section 类型 `mark / filter-status / copy / items / tablist / group / node`。
- `WorkbenchToolbarItems.tsx` — 配置驱动 items 渲染器。
- `WorkbenchToolbarItemBuilders.ts` — badge / button / share button / `显示全部` / `随机排序` 构造。
- `WorkbenchToolbarActionButton.tsx` — toolbar action button 渲染。
- `WorkbenchToolbarTabList.tsx` — toolbar tab list 渲染。

筛选结果与侧栏：
- `ConfiguredWorkbenchMetricsHeader.tsx` — 筛选结果头包装；自动补多语言摘要前缀。
- `WorkbenchFilterMetricsHeader.tsx` — 低层筛选结果头。
- `WorkbenchResultsScaffold.tsx` — 结果区包壳与空态。
- `WorkbenchSidebarFilterActions.tsx` — 左侧 `active count + 清空全部`。
- `WorkbenchSidebarFilterStatus.tsx` — 左侧筛选状态展示。

其他：
- `WorkbenchFloatingTopButton.tsx` — 右下角悬浮返回顶部。
- `workbenchMetricItemBuilders.ts` — metrics item 构造。

## Hooks

- `useWorkbenchResultsMotion.ts` — 筛选页右面板滚动恢复、回顶、悬浮按钮显隐。
- `useWorkbenchScrollNavigation.ts` — 非筛选页右面板悬浮返回顶部显隐。
- `useWorkbenchShareLink.ts` — 复制链接与 HashRouter 分享地址拼装。
- `useWorkbenchSidebarCollapse.ts` — 左抽屉开合持久化。

## 关键不变量

- 桌面端主页面使用 `PageWorkbenchShell`；无左栏页面不单独造单栏壳层。
- 工具条优先走 `toolbar` schema：用 `sections` 声明区域与顺序，组合用 `kind: 'group'`，特殊结构用 `kind: 'node'`。
- 工具条、复制链接、回顶、左侧状态头、筛选结果头复用本目录组件，不在页面里重复拼 chrome。
- 收起态只保留紧凑展开入口；左抽屉主体、边框和残余 gutter 一起退场。
- 桌面主滚动在右侧面板，不操作整页 `window.scrollY`；移动端退化为单列网页滚动。
