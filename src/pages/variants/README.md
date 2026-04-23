# Variants feature map

面向后续 AI 修改时的最小加载入口。

## 推荐加载顺序

1. `src/pages/VariantsPage.tsx`
2. `src/pages/variants/useVariantsPageModel.ts`
3. `src/pages/variants/query-state.ts`
4. `src/pages/variants/VariantsFilterBar.tsx`
5. `src/pages/variants/VariantsResultsSection.tsx`
6. `src/pages/variants/variant-model.ts`

## 关键不变量

- 当前页只做本地静态变体目录展示，但会把筛选状态同步到 URL；读写规则都收敛在 `query-state.ts`。
- 战役过滤默认值必须保持 `__all__`。
- 变体名 / 战役双语展示保留，长段限制与奖励文本只跟随当前界面语言展示。
- 默认最多先渲染前 50 条结果，避免一次性展开过多长文本卡片。
- 内容头部的“当前筛选”摘要出现 / 消失时，不应把下方结果面板整体向下推挤。

## 回归建议

- URL 同步、`view=all` 收起、复制当前链接优先跑 `tests/component/variantsPage.filters.test.tsx`。
- 结果头部与结果区的垂直稳定性优先跑 `tests/e2e/filter-layout-stability.spec.ts`。
