# 阵型编辑：范围、输入与第一阶段闭环

- 日期：2026-04-13
- 目标：回答“阵型编辑模块负责什么”“依赖哪些输入”“第一阶段要闭哪些环”。

## 模块定位与边界

- 阵型编辑负责把候选英雄摆进槽位，是查询页与方案存档页之间的连接层。
- 当前要解决：不同布局下怎么摆、同一 `seat` 是否冲突、当前已经放了谁、如何形成可恢复草稿。
- 当前不负责：自动推荐站位、真实战役布局全量映射、敌人机制模拟、技能连线和增益覆盖计算。

## 输入与依赖

- `public/data/v1/formations.json`：官方 definitions 自动提取的唯一布局库，保留 `sourceContexts / applicableContexts`
- `public/data/v1/champions.json`：可选英雄及其 `seat / roles`
- `src/pages/FormationPage.tsx`：页面入口
- `src/rules/seat.ts`：`findSeatConflicts`
- `src/data/formationDraftStore.ts`、`src/data/formationPersistence.ts`、`src/data/localDatabase.ts`：最近草稿与命名方案的本地持久化

## 第一阶段闭环

- 按战役 / 冒险 / 变体筛选布局。
- 按上下文名称中英混搜布局。
- 切换布局、为每个槽位选英雄、清空单槽 / 整体阵型。
- 实时提示 `seat` 冲突并生成阵型摘要。
- 保存最近草稿、恢复最近草稿、从当前工作草稿发起“保存为方案”。
- 移动端采用“缩略阵型棋盘 + 当前槽位编辑卡”，不依赖横向滑动。

## 布局筛选要求

- 场景类型至少支持：`全部 / 战役 / 冒险 / 变体`
- 关键词应匹配 `layout.name`、`layout.notes`、`sourceContexts[].name`，保留中英混搜
- 当前编辑布局与筛选结果解耦：即便当前布局被筛掉，也不能自动清空当前阵型，只提示“当前编辑布局不在筛选结果中”
- 指标卡需展示“布局库总数 / 当前匹配数”；零结果时提示用户放宽关键词或类型条件
