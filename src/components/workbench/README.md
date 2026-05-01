# workbench 目录说明

全站页面现在统一走工作台壳层；这里收纳与“页面工作台”直接相关的共享组件和 hook。结构与视觉基线见 `docs/modules/shared-components/page-workbench-design.md`。

## 推荐加载顺序

1. `src/components/workbench/PageWorkbenchShell.tsx`
   - 全站唯一页面工作台壳层；负责合并工具条、左抽屉开合、无左栏隐藏模式和桌面双栏内滚。
2. `src/components/workbench/ConfiguredWorkbenchPage.tsx`
   - 标准工作台包装层；优先消费统一 `toolbar` schema，把左侧标记、主文案、右侧按钮/气泡和浮动返回顶部收成配置，供详情页、工具页和归档页复用。
3. `src/components/workbench/workbenchToolbarConfig.tsx`
   - 工具条配置骨架；定义 `lead / primary / actions` 三段可配置区域，以及 `mark / filter-status / copy / items / node` 五类 section，让页面只描述内容和事件，不再手写 chrome 结构。
4. `src/components/workbench/WorkbenchScaffold.tsx`
   - 工作台内部稳定的展示骨架；统一 `toolbar mark / toolbar filter status / toolbar copy / toolbar badge / sidebar header / content stack / filter results header`。
5. `src/components/workbench/ConfiguredWorkbenchMetricsHeader.tsx`
   - 筛选结果头包装层；自动补多语言筛选摘要前缀，让页面只提供 metrics 和 active filters。
6. `src/components/workbench/WorkbenchFilterMetricsHeader.tsx`
   - 低层筛选结果头组件；负责组合 `PageHeaderMetrics + filter summary` 的结构。
7. `src/components/workbench/WorkbenchSidebarFilterActions.tsx`
   - 收敛筛选页左侧 `active count + 清空全部` 状态区；页面不再手写 badge 与 clear button 组合。
8. `src/components/workbench/WorkbenchToolbarItemBuilders.ts`
   - 统一构造 badge / button / share-style button / `显示全部` / `随机排序` 等 toolbar item 配置，页面只传文案、图标与事件。
9. `src/components/workbench/WorkbenchResultsScaffold.tsx`
   - 统一筛选结果区的包壳与空态；页面只传 aria label、容器类名、empty copy 和结果内容。
10. `src/components/workbench/WorkbenchToolbarItems.tsx`
   - 配置驱动的 toolbar items 渲染器；页面只传 badge / button 配置和回调，不再手写右侧区结构。分享按钮也回到统一 button schema。
11. `src/components/workbench/useWorkbenchResultsMotion.ts`
   - 处理筛选页右侧面板滚动恢复、筛选回顶和悬浮返回顶部显隐。
12. `src/components/workbench/useWorkbenchScrollNavigation.ts`
   - 处理非筛选页右侧面板的悬浮返回顶部显隐。
13. `src/components/workbench/useWorkbenchShareLink.ts`
   - 统一复制当前链接状态机与 HashRouter 分享地址拼装。
14. `src/components/workbench/useWorkbenchSidebarCollapse.ts`
   - 统一左抽屉开合持久化；页面只传稳定 `storageKey`。
15. `src/components/workbench/WorkbenchFloatingTopButton.tsx`
   - 统一右下角悬浮返回顶部按钮。
16. `src/styles/shared/workbench/scaffold.css`
   - 工作台稳定骨架的共享样式；收纳 toolbar、sidebar header 和 filter content header 的视觉基线。
17. `src/styles/shared/workbench/shell.css`
   - 工作台外壳、抽屉动画、无左栏模式、悬浮按钮和内滚容器。

## 关键不变量

- 桌面端所有主页面都必须使用 `PageWorkbenchShell`；不再恢复旧 `filter-*` 外壳路线。
- 页面工具条优先走统一 `toolbar` schema，把左侧标记/筛选状态、主文案、右侧按钮与统计气泡都收进配置；只有确实特殊的结构才用 `kind: 'node'` 注入自定义节点。
- 工具条文案区、复制链接按钮、工具条按钮组、回顶按钮、左侧状态头、筛选动作按钮和筛选结果头优先复用 `src/components/workbench/ConfiguredWorkbenchPage.tsx`、`src/components/workbench/FilterWorkbenchPage.tsx`、`src/components/workbench/workbenchToolbarConfig.tsx`、`src/components/workbench/ConfiguredWorkbenchMetricsHeader.tsx`、`src/components/workbench/WorkbenchScaffold.tsx`、`src/components/workbench/WorkbenchSidebarFilterActions.tsx`、`src/components/workbench/WorkbenchToolbarItemBuilders.ts` 与 `src/components/workbench/WorkbenchFilterMetricsHeader.tsx`；不要在页面里重复拼同一套 chrome。
- 左右结构是统一壳层语义；当前没有左栏的页面也不单独造一套单栏壳层。
- 收起态只保留紧凑展开入口；左抽屉主体、边框和残余 gutter 必须一起退场。
- 筛选页和详情/工具页的主滚动都发生在右侧面板，不操作整页 `window.scrollY`。
- 移动端继续退化为普通单列网页滚动，不维持桌面工作台高度锁定。
