# 英雄筛选：赞助人（Patron）过滤

**状态**: 已落地
**类型**: change
**范围**: champions
**创建日期**: 2026-08-06

## 目标

英雄列表新增「赞助人」筛选维度——选中某位赞助人后，只显示该赞助人允许上场的英雄（`eligiblePatronIds` 命中），让玩家做赞助人合约冒险时一眼看出谁能出战。

## 范围

数据已就绪：`champions.json` 每位英雄带 `patronEligibility.eligiblePatronIds`（`forceAllowed ∪ ruleQualified` 的合并结果，构建于 `scripts/data/official-rule-helpers.ts:474`）；`enums.json` 有 `patrons` 枚举（5 位赞助人，value 格式 `{id, original, display}`，带独立 id，区别于 affiliations 的 `{original, display}`）。

涉及模块：

- 规则层 `src/rules/championFilter.ts`（加 patrons 维度）
- 数据加载 `src/pages/champions/useChampionCollectionState.ts` + 类型（patrons 是第三种 enum 格式，需新增校验器）
- URL 状态 `src/features/champion-filters/query-state.ts`（patron 序列化）
- 筛选 UI 组件（patron 多选组 + chip）
- 文档 `docs/specs/modules/champions/filter/`

## 阶段 Checklist

- [x] 阶段 1: 规则层 —— `championFilter.ts` 加 `patrons: string[]` + `matchesPatron`（`eligiblePatronIds` 命中），co-located 单测覆盖 —— 验证：`npm run test:run`
- [x] 阶段 2: 数据加载 —— types/enumGroups 加 `IdLocalizedEnumGroup` 校验器，`useChampionCollectionState` 加载 patrons，`ChampionState` 加 patrons —— 验证：patrons 正确加载
- [x] 阶段 3: URL 状态 —— `query-state.ts` 加 patron param key + `selectedPatrons` 序列化/反序列化 + 测试 —— 验证：`query-state.test.ts` 通过
- [x] 阶段 4: UI —— 筛选项加 patron 多选组（同构 affiliations 渲染，id 匹配）+ active chip + 接线 —— 验证：`npm run build` + 浏览器交互
- [x] 阶段 5: 文档收口 —— `filter/rules.md` / `scope-and-data.md` 更新，`requirements/2026-08-champion-filter-extensions.md` 子项 1 打钩 —— 验证：文档与代码一致

## 验收

- 选中赞助人 X → 只显示 `eligiblePatronIds` 含 X 的英雄
- 多选赞助人 → OR（命中任一即显示）
- 筛选状态持久化到 URL，刷新可恢复
- active chip 可单独清除
- 全量测试通过

## 落地后

- specs/ 更新点：
  - `docs/specs/modules/champions/filter/rules.md`：当前筛选规则加 Patron 维度
  - `docs/specs/modules/champions/filter/scope-and-data.md`：数据合同加 patrons enum 消费
- `requirements/2026-08-champion-filter-extensions.md` 子项 1 打钩
- 本 change 状态 → 已落地 → 移 `archives/plans/`
- **specs/ 永不引用本 plan**（规范描述最终态，不描述交付过程）
