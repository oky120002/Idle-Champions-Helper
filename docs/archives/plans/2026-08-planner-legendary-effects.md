# planner 传奇装备效果接入

**状态**: 已落地
**类型**: milestone
**范围**: planner
**创建日期**: 2026-08-24

## 来源

- 需求库：`docs/archives/requirements/2026-08-planner-legendary-effects.md`
- 其他来源：`docs/specs/modules/planner/simulator.md`、`docs/specs/modules/planner/requirements.md`、用户明确要求完成整个需求

## 目标

在保留存档驱动评分的前提下，补齐无存档传奇假设配置和阵型上下文锻造优先级建议，让 planner 能回答“假设传奇后阵型如何变化”和“鳞片优先花在哪些英雄”。

## 范围

- 传奇效果假设配置：纯函数输入、planner 页面控件、无存档分支的评分装配与结果解释。
- 锻造优先级建议：基于当前阵型、候选英雄和传奇目录的确定性排序、增量估算与 planner 展示。
- 阶段一既有存档驱动评分保持兼容，并补齐跨阶段契约测试。
- 同步 planner 当前规范、需求终态和计划归档；不实现重铸概率、神眷管理或传奇专长。

## 阶段 Checklist

- [x] 阶段 1: 阶段一契约复核与假设数据模型 —— 验证方式：传奇收集、等级缩放、未知效果跳过和已有存档行为测试通过
- [x] 阶段 2: 无存档传奇假设配置 —— 验证方式：配置控件可修改，全英雄全槽假设只在无存档分支生效，评分装配单测与组件测试通过
- [x] 阶段 3: 锻造优先级建议 —— 验证方式：给定阵型和目录时输出稳定 TOP 5，覆盖全队、条件主输出和按阵型人数叠加三类效果
- [x] 阶段 4: 文档与发布收口 —— 验证方式：更新 specs，需求文件移入 `docs/archives/requirements/`，计划标记已落地后移入 `docs/archives/plans/`

## 验收

- 无存档时可配置统一传奇等级，并将目录中可解析的传奇效果纳入 planner 评分；有存档时不叠加假设传奇。
- 锻造建议只使用可解释、可复现的现有评分通道，展示英雄、效果类型、当前阵型条件和预估增量；未知或无法安全解析的效果被跳过并可追溯。
- 阶段一至三均有 co-located 测试，`npm run typecheck`、相关 Vitest、lint 和数据契约验证通过。
- 当前规范只描述最终行为，不引用本计划；需求与计划按治理规则完成归档。

## 落地后

- specs/ 更新点：
  - `docs/specs/modules/planner/requirements.md`：传奇假设配置和锻造建议的输入、边界与隐私行为
  - `docs/specs/modules/planner/simulator.md`：传奇假设与优先级建议的评分口径
- `docs/archives/requirements/2026-08-planner-legendary-effects.md`：已标记“已落地”终态
- 本 milestone 状态 → 已落地 → 移入 `docs/archives/plans/`
- **specs/ 永不引用本 milestone**（规范描述最终态，不描述交付过程）
