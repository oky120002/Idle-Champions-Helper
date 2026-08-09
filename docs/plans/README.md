# plans/ —— 变更与里程碑

确认要做、准备执行的变更计划。`已确认 → 已落地`；达到 `已落地` 后移动到 `archives/plans/`。承载「按什么顺序改」，**不描述系统现状**（现状在 `specs/`），**不做需求积压**（需求在 `requirements/`）。

## 与 requirements/ 的区别

Requirement 是需求意图（可能永远不做），Plan 是执行计划（确认要做）。提案被接受后，在 `plans/` 新建对应执行计划，提案保留至实现完成；需求一旦落地或被否决，立即移入 `archives/requirements/`。

## 命名

`YYYY-MM-<scope>-<slug>.md`（scope = 模块名或 `system`）

## 类型

- **change**：常规变更（新增/重构/修复的范围规划）
- **milestone**：大阶段里程碑（含多阶段 checklist）

## 状态生命周期

- `已确认`：确认要做，准备执行
- `已落地`：已实现（`specs/` 已更新为最终态）→ 移 `archives/plans/`

## 里程碑怎么写

`类型: milestone` 的文件结构（见 [`_template.md`](./_template.md)）：

1. **目标**：一句话结论 + 价值
2. **范围**：涉及哪些模块/文件
3. **阶段 Checklist**：每阶段可独立验证（勾选式）
4. **验收**：整体 DoD
5. **落地后**：列出 specs/ 要更新的点

## 铁律

**`specs/` 永不引用 plans/milestone。** 规范描述「现在是什么」，不描述「里程碑交付了什么」。计划文档的生命周期与活跃规范不同——计划可能被废弃、缩减或改向，一旦被 spec 引用就会把计划的不确定性传播到当前态描述中，使规范变谎。

## 落地流程

1. plan 完成 → 更新 `specs/` 描述新现状（不写迁移叙事）
2. 所有 checkbox 闭合才能归档；执行中发现的后续项直接写 TODO/requirements，不作为悬空 checkbox 留在计划里
3. plan 标 `状态: 已落地`
4. 移到 `archives/plans/`
5. 落地期间产生的持久决策 → 写 ADR（`decisions/`）
