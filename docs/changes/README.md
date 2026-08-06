# changes/ —— 变更、里程碑与计划

有生命周期的文档：`Draft → Accepted → Landed`；达到 `Landed` 后移动到 `archive/changes/`，状态保持为 `Landed`。承载「要做什么」与「按什么顺序」，**不描述系统现状**（现状在 `specs/`）。

## 命名

`YYYY-MM-<scope>-<slug>.md`（scope = 模块名或 `system`）

## 类型

- **change**：常规变更（新增/重构/修复的范围规划）
- **milestone**：大阶段里程碑（含多阶段 checklist，对应你的「大阶段里程碑模式」）

## Status 生命周期

- `Draft`：规划中
- `Accepted`：确认要做
- `Landed`：已实现（`specs/` 已更新为最终态）→ 移 `archive/changes/`，状态保持不变

## 里程碑怎么写

`Type: milestone` 的文件结构（见 [`_template.md`](./_template.md)）：

1. **目标**：一句话结论 + 价值
2. **范围**：涉及哪些模块/文件
3. **阶段 Checklist**：每阶段可独立验证（勾选式，对应「大阶段里程碑模式」）
4. **验收**：整体 DoD
5. **落地后**：列出 specs/ 要更新的点

## 超长 plan 怎么管（与 Claude Code plan mode 衔接）

- plan mode 产出的方案，非小型的落盘到这里（`Type: change` 或 `milestone`）
- 大 plan 用「阶段 Checklist」拆成可独立验证的子任务，每完成一个勾选
- 全部完成 → `Status: Landed` → 按「落地后」清单更新 specs/ → 移 `archive/changes/`

## 铁律

**`specs/` 永不引用 changes/milestone。** 规范描述「现在是什么」，不描述「里程碑交付了什么」。计划文档的生命周期与活跃规范不同——计划可能被废弃、缩减或改向，一旦被 spec 引用就会把计划的不确定性传播到当前态描述中，使规范变谎。

## 落地流程

1. change 完成 → 更新 `specs/` 描述新现状（不写迁移叙事）
2. change 标 `Status: Landed`
3. 移到 `archive/changes/`
4. 落地期间产生的持久决策 → 写 ADR（`decisions/`）
