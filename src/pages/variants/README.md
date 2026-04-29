# Variants feature map

面向后续 AI 修改时的最小加载入口。

## 推荐加载顺序

1. `src/pages/VariantsPage.tsx`
2. `src/pages/variants/useVariantsPageModel.ts`
3. `src/pages/variants/query-state.ts`
4. `src/pages/variants/VariantsNavigationSidebar.tsx`
5. `src/pages/variants/VariantAdventureDetail.tsx`
6. `src/pages/variants/VariantAdventureTabs.tsx`
7. `src/pages/variants/variant-detail-model.ts`

## 关键不变量

- 当前页只做本地静态变体目录展示，地图 / 关卡 / 分页状态同步到 URL；读写规则都收敛在 `query-state.ts`。
- 战役过滤默认值仍保持 `__all__`，页面就绪后由模型派生到第一个可用地图与关卡。
- 变体名 / 战役双语展示保留，长段限制与奖励文本只跟随当前界面语言展示。
- 左侧上方是本地模糊搜索下拉，结果按地图分组；左侧下方只展示当前地图的关卡。
- 右侧只展示当前关卡详情：敌人类型占比、攻击占比、特殊敌人、区域节点、阵型和分页列表。
- 敌人类型占比必须优先读取 `Variant.enemyTypeCounts`，分母使用 `Variant.enemyCount`；不要从 `enemyTypes` 标签列表平均分摊。
- 当前公共数据没有官方地图图片与剧情文本字段；不要镜像第三方站点私有地图或剧情内容。

## 回归建议

- URL 同步、地图 / 关卡切换、复制当前链接优先跑 `tests/component/variantsPage.filters.test.tsx`。
- 结果头部与结果区的垂直稳定性优先跑 `tests/e2e/filter-layout-stability.spec.ts`。
