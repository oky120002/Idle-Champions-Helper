# workbench 目录说明

全站页面现在统一走工作台壳层；这里收纳与“页面工作台”直接相关的共享组件和 hook。结构与视觉基线见 `docs/modules/shared-components/page-workbench-design.md`。

## 推荐加载顺序

1. `src/components/workbench/PageWorkbenchShell.tsx`
   - 全站唯一页面工作台壳层；负责合并工具条、左抽屉开合、无左栏隐藏模式和桌面双栏内滚。
2. `src/components/workbench/WorkbenchScaffold.tsx`
   - 工作台内部稳定的展示骨架；统一 `toolbar mark / toolbar filter status / toolbar copy / toolbar badge / share button / sidebar header / content stack / filter results header`。
3. `src/components/workbench/WorkbenchFilterMetricsHeader.tsx`
   - 配置驱动的筛选结果头组件；页面只负责产出 metrics items 和 active filters，不再重复拼 `PageHeaderMetrics + filter summary`。
4. `src/components/workbench/WorkbenchFilterActions.tsx`
   - 收敛筛选页共享动作：左侧 `active count + 清空全部` 状态区，以及右侧 `显示全部 / 随机排序 / 分享` toolbar item builders。
5. `src/components/workbench/WorkbenchToolbarItems.tsx`
   - 配置驱动的右侧 toolbar items 组件；页面只传 badge / button / share 配置和回调，不再手写右侧区结构。
6. `src/components/workbench/useWorkbenchResultsMotion.ts`
   - 处理筛选页右侧面板滚动恢复、筛选回顶和悬浮返回顶部显隐。
7. `src/components/workbench/useWorkbenchScrollNavigation.ts`
   - 处理非筛选页右侧面板的悬浮返回顶部显隐。
8. `src/components/workbench/useWorkbenchShareLink.ts`
   - 统一复制当前链接状态机与 HashRouter 分享地址拼装。
9. `src/components/workbench/useWorkbenchSidebarCollapse.ts`
   - 统一左抽屉开合持久化；页面只传稳定 `storageKey`。
10. `src/components/workbench/WorkbenchFloatingTopButton.tsx`
   - 统一右下角悬浮返回顶部按钮。
11. `src/styles/shared/workbench/scaffold.css`
   - 工作台稳定骨架的共享样式；收纳 toolbar、sidebar header 和 filter content header 的视觉基线。
12. `src/styles/shared/workbench/shell.css`
   - 工作台外壳、抽屉动画、无左栏模式、悬浮按钮和内滚容器。

## 关键不变量

- 桌面端所有主页面都必须使用 `PageWorkbenchShell`；不再恢复旧 `filter-*` 外壳路线。
- 工具条文案区、复制链接按钮、左侧状态头、筛选动作按钮和筛选结果头优先复用 `src/components/workbench/WorkbenchScaffold.tsx`、`src/components/workbench/WorkbenchFilterActions.tsx` 与 `src/components/workbench/WorkbenchFilterMetricsHeader.tsx`；不要在页面里重复拼同一套 chrome。
- 左右结构是统一壳层语义；当前没有左栏的页面也不单独造一套单栏壳层。
- 收起态只保留紧凑展开入口；左抽屉主体、边框和残余 gutter 必须一起退场。
- 筛选页和详情/工具页的主滚动都发生在右侧面板，不操作整页 `window.scrollY`。
- 移动端继续退化为普通单列网页滚动，不维持桌面工作台高度锁定。
