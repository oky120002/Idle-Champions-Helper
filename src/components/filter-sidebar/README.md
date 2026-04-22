# filter-sidebar 目录说明

这里现在只保留筛选字段组件与筛选视觉基元；全站工作台壳层、复制链接、抽屉开合和滚动语义已经迁到 `src/components/workbench/`。

## 推荐加载顺序

1. `src/styles/shared/filters/sidebar.css`
   - 共享 badge / section label 等筛选视觉基元。
2. 具体字段组件
   - `FilterSearchField.tsx`
   - `FilterChipSingleSelectField.tsx`
   - `FilterChipMultiSelectField.tsx`
   - `FilterSingleSelectField.tsx`
   - `FilterSegmentedField.tsx`

## 关键不变量

- 这里的字段组件只负责“输入即业务值”的薄壳，不重复持有筛选规则。
- 页面壳层、抽屉动画和复制链接逻辑不再回放到本目录。
- 若要改桌面工作台结构，直接去 `src/components/workbench/` 与 `src/styles/shared/workbench/shell.css`。
