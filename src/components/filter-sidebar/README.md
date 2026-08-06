# filter-sidebar 目录说明

筛选字段组件与筛选视觉基元；全站工作台壳层在 `src/components/workbench/`。

## 推荐加载顺序

1. `src/styles/shared/filters/sidebar.css`
   - 共享 badge / section label 等筛选视觉基元。
2. 具体字段组件
   - `FilterSidebarSchemaRenderer.tsx`
   - `FilterSearchField.tsx`
   - `FilterChipSingleSelectField.tsx`
   - `FilterChipMultiSelectField.tsx`
   - `FilterSingleSelectField.tsx`
   - `FilterSegmentedField.tsx`

## 关键不变量

- 字段组件只负责“输入即业务值”的薄壳，不重复持有筛选规则。
- `FilterSidebarSchemaRenderer.tsx` 负责按 schema 组装这些字段；页面优先传配置。
- 页面壳层、抽屉动画和复制链接逻辑在 `src/components/workbench/`。
