# Illustrations feature map

面向后续 AI 修改时的最小加载入口，避免整页重扫。

## 推荐加载顺序

1. `src/pages/IllustrationsPage.tsx`
   - 只看页面级编排、SurfaceCard 文案和 ready / loading / error 分支。
2. `src/pages/illustrations/useIllustrationsPageModel.ts`
   - 看筛选数据、结果数据、分享链接与 actions 如何装配。
3. `src/pages/illustrations/useIllustrationFilterState.ts`
   - 看 URL 初始化、本地筛选状态、展开状态和分享反馈状态。
4. `src/pages/illustrations/IllustrationsPrimaryFilters.tsx`
   - 高频筛选区、复制链接、清空全部、Active chips。
5. `src/pages/illustrations/IllustrationsAdditionalFilters.tsx`
   - 低频标签筛选区与折叠面板。
6. `src/pages/illustrations/IllustrationsResultsSection.tsx`
   - 结果摘要、默认 24 张限制、展开 / 收起按钮。
7. `src/pages/illustrations/illustration-model.ts`
   - 纯逻辑：active chips、立绘文案、kind 统计、结果 entry 组装。
8. `src/pages/illustrations/query-state.ts`
   - URL 查询参数读写与 share URL 组装。

## 文件职责

- `constants.ts`: query key 与默认结果上限。
- `types.ts`: feature 内部类型边界。
- `illustration-filter-actions.ts`: 所有筛选 mutation 的统一出口。
- `useIllustrationCollectionState.ts`: 立绘 / 英雄 / enums 读取。
- `IllustrationResultCard.tsx`: 单张结果卡片。
- `IllustrationsMetrics.tsx`: 页头指标卡。
- `IllustrationsSidebar.tsx`: 把主筛选区和补充筛选区拼起来。

## 关键不变量

- `scope` query param 只允许 `all | hero-base | skin`。
- `results=all` 表示展开全部结果；任何筛选变更都应自动重置为默认 24 张。
- 分享链接必须保留当前 query string，并输出 `#/illustrations?...` 形式的 hash URL。
- 页面默认只渲染首批结果卡片，避免一次性把整批图片塞进 DOM。
- 现有测试覆盖了 URL 同步、复制链接、默认 24 张和 URL 恢复展开状态；改动这些逻辑前先跑 `tests/component/illustrationsPage.test.tsx`。
