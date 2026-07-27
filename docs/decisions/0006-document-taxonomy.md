# ADR-0006：文档采用五类活跃资产与一类历史归档

**Status**: Accepted
**Decided**: 2026-07-27

## 背景

原结构没有当前操作手册的稳定位置，导致仍有效的开发、测试、部署和排障步骤进入冷归档，测试操作又混入 Research；规范与研究中也残留计划叙事。

## 决策

`docs/` 使用五类活跃资产 `specs/`、`research/`、`decisions/`、`changes/`、`runbooks/`，以及一类历史归档 `archive/`：分别回答当前是什么、事实是什么、为什么选择、准备改什么、现在怎样操作、过去发生什么。

Spec 可以链接 ADR 作为依据，但不得复述决策历史；Spec 不链接 Change。Research 不承载本项目的选择或实施顺序。Runbook 随代码与环境变化原地更新，不作为事故日志。

## 后果

- 不引入独立 `evidence/`、`plans/` 或框架专用 feature 目录，避免增加跨目录回跳。
- 吸收 Spec Kit 的跨产物检查、Superpowers 的设计与计划分离、Diátaxis 的读者意图分离，不复制完整目录或工具链。

## 依据

- `docs/research/documentation/framework-practices.md`
- `docs/specs/guidelines/documentation-governance.md`
