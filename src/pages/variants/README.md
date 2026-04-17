# Variants feature map

面向后续 AI 修改时的最小加载入口。

## 推荐加载顺序

1. `src/pages/VariantsPage.tsx`
2. `src/pages/variants/useVariantsPageModel.ts`
3. `src/pages/variants/VariantsFilterBar.tsx`
4. `src/pages/variants/VariantsResultsSection.tsx`
5. `src/pages/variants/variant-model.ts`

## 关键不变量

- 当前页只做本地静态变体目录展示，不做 URL 同步。
- 战役过滤默认值必须保持 `__all__`。
- 变体名 / 战役双语展示保留，长段限制与奖励文本只跟随当前界面语言展示。
- 默认最多先渲染前 60 条结果，避免一次性展开过多长文本卡片。
