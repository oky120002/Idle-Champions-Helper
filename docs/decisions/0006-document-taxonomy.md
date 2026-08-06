# 0006. 文档采用六类活跃资产与一类历史归档

**Status**: Accepted
**Decided**: 2026-07-27

## 背景

原结构没有当前操作手册的稳定位置，导致仍有效的开发、测试、部署和排障步骤进入冷归档，测试操作又混入 Research；规范与研究中也残留计划叙事。

## 决策

`docs/` 使用六类活跃资产 `specs/`、`requirements/`、`research/`、`decisions/`、`plans/`、`runbooks/`，以及一类历史归档 `archives/`：分别回答系统现在是什么、将来可能做什么、外部事实是什么、为什么选择、接下来按什么步骤改、现在怎样操作、过去发生了什么。

Proposal 与 Change 分离：Proposal 是需求意图（可能永远不做），Change 是确认要做的执行计划。Spec 可以链接 ADR 作为依据，但不得复述决策历史；Spec 不链接 Change。Research 不承载本项目的选择或实施顺序。Runbook 随代码与环境变化原地更新，不作为事故日志。

## 后果

- 不引入独立 `evidence/`、`plans/` 或框架专用 feature 目录，避免增加跨目录回跳。
- 吸收 Spec Kit 的跨产物检查、Superpowers 的设计与计划分离、Diátaxis 的读者意图分离，不复制完整目录或工具链。

## 关联

- 依据：`docs/research/documentation/framework-practices.md`
- 落地：`docs/governance.md`
