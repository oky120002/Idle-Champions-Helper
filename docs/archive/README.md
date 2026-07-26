# archive/ —— 历史归档

冷存储。**默认不参考**；仅在考古（复现旧问题、追溯变更史）时读取。

## 子目录

- `investigations/`：历史问题排查记录（已解决/已定位的 past events）
- `troubleshooting/`：已沉淀的故障摘要
- `changes/`：已落地的 changes（从 `changes/` 移入，保留里程碑与变更史）

## 规则

- 进入 archive 的文档**不再更新**（如需重新决策，新开 `decisions/` ADR 或 `changes/` change）
- 查当前态 → `specs/`（功能）或 `research/`（事实）
- 查决策史 → `decisions/`（ADR 含 `Superseded` 记录，不进 archive）
- 查「某里程碑做了什么」→ `archive/changes/`
- 查「某旧问题怎么解的」→ `archive/investigations/` 或 `archive/troubleshooting/`

## 何时移入

- investigations/troubleshooting：问题解决并验证后，从主结构移入
- changes：Status 变 `Landed` 后移入 `archive/changes/`
- 不主动清理（历史可追溯），但也不让它在主结构占位
