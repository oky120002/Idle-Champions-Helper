# 英雄筛选：规则与架构边界

## 当前筛选规则

- 关键词：命中 `name`、`tags`、`affiliations`
- `seat`：`1..12`，支持多选
- 定位：来自 `enums.roles`
- 联动队伍：来自 `enums.affiliations`
- 赞助人：来自 `enums.patrons`，按 `patronEligibility.eligiblePatronIds` 命中（多选 OR）
- 标签派生组：种族、性别、职业、阵营、获取方式、特殊机制
- 特殊机制按 `站位相关 / 控制效果 / 专精方向` 三组展示

统一组合逻辑：各维度之间 `AND`；关键词内部 `OR`；`seat / 定位 / 联动队伍 / 赞助人 / 标签组` 在各自维度内 `OR`；「全部」表示该维度不过滤。

## 状态与架构边界

- 页面状态保留三态：`loading`、`ready`、`error`。
- 枚举读取、枚举校验和纯筛选逻辑不下沉到 `ChampionsPage` 页面层。
- 规则强化走 `src/rules/championFilter.ts` 与 `src/features/champion-filters/`，不在 JSX 里硬塞规则。
