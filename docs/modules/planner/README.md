# planner 模块文档入口

- 作用：收纳自动阵型计划器的产品需求、技术设计、Ralph 任务拆分和验收契约。
- 边界：本目录是设计和任务契约来源；实际开发由 `.ralph/tasks/planner/` 中的 story 驱动。

## 当前演进规划（v5·执行入口）

- **[`evolution-plan.md`](./evolution-plan.md)**：阵型模拟器演进规划总纲（三层架构 + 16 阶段进度追踪 + TDD 硬约束 + 里程碑分组 + 命名修正 A1 + 加成聚合调研）。新 session 读总纲了解全貌，再按里程碑读对应 `milestone-{1..4}-*.md` 执行步骤（每阶段一个 session 避免上下文超标）；M1 审计发现见 `m1-audit-findings.md`。命名以 v5 为准（通用符号去 Planner）。
- **[`goal-prompts.md`](./goal-prompts.md)**：4 个里程碑 `/goal` 提示词（M1 核心引擎 / M2 数据补全 / M3 补强 / M4 UI），copy 到 Claude Code 即可按里程碑驱动执行（配合 evolution-plan.md 的 `[ ]`/`[x]` 进度追踪跨 session 衔接）。

## 先读哪篇

- 总体路线、阶段边界、关键决策：`docs/modules/planner/auto-formation-planner-plan.md`
- 产品目标、用户流程、隐私与基线要求：`docs/modules/planner/prd.md`
- 架构总览和实现入口：`docs/modules/planner/development-design.md`
- 推荐英雄、站位、planner model 与 merge 规则：`docs/modules/planner/recommendation-and-placement-design.md`
- planner signal 真实覆盖率盘点：`docs/modules/planner/signal-coverage-research.md`
- 表达式求值器（数值 per_hero_expr 统一 + requirements/condition/effect_string args 审计）规划：`docs/modules/planner/expression-evaluator-plan.md`
- 数据、隐私、存储和官方只读 client：`docs/modules/planner/development-design-data.md`
- 数字层、基线、模拟器、搜索和 UI：`docs/modules/planner/development-design-simulator.md`
- Ralph 执行任务、验收命令、提交约定：`docs/modules/planner/ralph-stories.md`
- 主线外顺手发现项统一落库：根 `TODO.md`（`auto-todo` 技能维护）
- 单例验收设计：`.ralph/tasks/planner/acceptance-cases.md`

## 关联入口

- Ralph 任务包：`.ralph/tasks/planner/README.md`
- Ralph 验收用例：`.ralph/tasks/planner/acceptance-cases.md`
- 个人数据导入现状：`docs/modules/user-data/user-data-import-design.md`
- 阵型编辑现状：`docs/modules/formation/README.md`
- 方案存档现状：`docs/modules/presets/README.md`
