# filter-sidebar 目录说明

桌面端四个筛选页现在统一走工作台壳层，不再保留旧 `FilterSidebarLayout` / `FilterSidebarToolbar` 路线。

## 推荐加载顺序

1. `src/components/filter-sidebar/FilterWorkbenchShell.tsx`
   - 统一外层工作台大壳、左抽屉开合、合并工具栏和桌面端双栏内滚。
2. `src/components/filter-sidebar/useWorkbenchResultsMotion.ts`
   - 统一右侧结果区滚动恢复、筛选回顶和悬浮返回顶部按钮显隐。
3. `src/components/filter-sidebar/useWorkbenchShareLink.ts`
   - 统一四页 `复制当前链接` 状态机与 HashRouter 分享地址拼装。
4. `src/components/filter-sidebar/useFilterSidebarCollapse.ts`
   - 共享抽屉开合状态持久化；页面只传稳定 `storageKey`。
5. `src/components/filter-sidebar/WorkbenchResultsFloatingTopButton.tsx`
   - 统一右下角悬浮返回顶部按钮。
6. `src/styles/shared/filters/workbench-shell.css`
   - 工作台外壳、抽屉动画、悬浮按钮和内滚容器。
7. `src/styles/shared/filters/sidebar.css`
   - 共享 badge / section label 等筛选视觉基元。
8. 具体字段组件
   - `FilterSearchField.tsx`
   - `FilterChipSingleSelectField.tsx`
   - `FilterChipMultiSelectField.tsx`
   - `FilterSingleSelectField.tsx`
   - `FilterSegmentedField.tsx`

## 目录职责

- `FilterWorkbenchShell.tsx`
  - 是四个筛选页唯一的桌面端工作台壳层。
  - 页面必须传稳定的 `storageKey`，保证不同页面的抽屉状态互不串页。
- `useWorkbenchResultsMotion.ts`
  - 只处理右侧结果区滚动语义，不关心具体业务过滤规则。
- `useWorkbenchShareLink.ts`
  - 只处理复制链接与短暂反馈，不持有页面筛选状态。
- 字段组件
  - 维持“输入即业务值”的薄壳，不在组件内部重复维护筛选业务规则。

## 关键不变量

- 桌面端四个筛选页都必须使用 `FilterWorkbenchShell`；不再新增或恢复旧双栏布局分支。
- 收起态只保留紧凑展开入口；左抽屉主体、边框和残余 gutter 必须一起退场。
- 筛选变更和结果展开 / 收起后，只回顶右侧结果区，不操作整页 `window.scrollY`。
- 移动端继续退化为普通单列网页滚动，不维持桌面工作台高度锁定。
- 共享样式改动后，要回看 Champions / Illustrations / Pets / Variants 四页，确认抽屉开合和工具栏合并关系保持一致。
