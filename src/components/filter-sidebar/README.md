# filter-sidebar 目录说明

面向共享筛选侧栏的最小加载入口，避免每次改页面筛选 UI 都把四个页面和整套样式重新扫一遍。

## 推荐加载顺序

1. `src/components/filter-sidebar/FilterSidebarLayout.tsx`
   - 左右列布局、收起 / 展开状态、localStorage 持久化和移动端 / 桌面端共用开关入口。
2. `src/components/filter-sidebar/FilterSidebarPanel.tsx`
   - 侧栏表面壳层，只负责标题、说明、状态区和内容承载。
3. `src/components/filter-sidebar/useFilterSidebarCollapse.ts`
   - 共享持久化状态读取与写回；页面只传稳定 `storageKey`，不要自己重复造轮子。
4. `src/styles/shared/filters/sidebar-layout.css`
   - 布局宽度、桌面导轨、移动端折叠过渡和 sticky 行为。
5. `src/styles/shared/filters/sidebar.css`
   - 侧栏面板表面、状态徽记和滚动约束。
6. 具体字段组件
   - `FilterSearchField.tsx`
   - `FilterChipSingleSelectField.tsx`
   - `FilterChipMultiSelectField.tsx`
   - `FilterSingleSelectField.tsx`
   - `FilterSegmentedField.tsx`

## 目录职责

- `FilterSidebarLayout.tsx`
  - 只做共享布局和交互壳层。
  - 页面必须传稳定的 `storageKey`，保证不同页面的收起状态互不串页。
- `FilterSidebarPanel.tsx`
  - 不持有布局状态。
  - 页面级标题、说明、按钮和状态徽记都放这里拼装。
- 各字段组件
  - 维持“输入即业务值”的薄壳，不在组件内部重复维护筛选业务规则。

## 关键不变量

- 桌面端展开时开关固定在侧栏顶部工具位；收起后再切换为窄导轨入口，避免与侧栏内部滚动条冲突。
- 移动端不能只剩图标开关；必须保留完整文案入口，避免误触成本过高。
- 收起状态只影响侧栏可见性，不应清空任何筛选条件。
- `FilterSidebarLayout` 不依赖具体页面路由；页面自己提供 `storageKey`。
- 共享样式改动后，要回看冠军、立绘、宠物、变体四页，确认没有出现导轨宽度串用或 sticky 裁切。

## 何时继续拆分

- 如果后续再增加桌面拖拽调宽、按断点切换导轨文案或更复杂的侧栏记忆规则，优先继续拆到 `useFilterSidebarCollapse.ts` 邻近模块。
- 如果字段组件开始出现跨页面特化分支，不要继续往共享组件里堆 `variant`；应回到页面目录拆局部组件。
