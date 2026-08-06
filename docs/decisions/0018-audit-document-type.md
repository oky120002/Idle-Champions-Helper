# 0018. 文档新增 Audit 第七类活跃资产

**Status**: Accepted
**Decided**: 2026-08-06

## 背景

ADR 0006 确立六类活跃资产（Spec / Requirement / Research / Decision / Plan / Runbook）与一类历史归档（Archive）。但 `docs/audits/` 目录在此框架建立前就已存在，承载按轮次的深度审计报告（结构化排查、发现/证据/处置结论），有自己的命名规则（`-audit` / `-recon`）和与其他目录的关系约定，却从未被分类框架正式承认——是治理盲区。

## 决策

将 Audit（审计）正式纳入活跃资产分类，从六类扩展为七类。Audit 回答「验证/审计了什么」，与 Spec（「系统现在是什么」）互补：Spec 是持续维护的当前态，Audit 是某次审计的时点快照。

## 审计文档的时点快照特性

审计是某个时间点的结构化排查结论。随项目推进，审计中的数据、状态和结论会自然过时——这是固有特性，不是缺陷。**不要求审计文档与当前态同步**：

- 当前态 → `specs/`
- 审计发现的事实 → `research/`
- 审计引发的决策 → `decisions/`
- 审计暴露的需求 → `requirements/`

审计报告保留作回归基线和决策依据，结论落地后标注收口状态，不再持续维护。

## 后果

- `docs/` 从六类活跃资产扩展为七类活跃资产与一类历史归档。
- ADR 0006 保持「六类」原文（append-only 历史记录），本 ADR 扩展其分类计数；0006 的类型分离原则与读者意图不变。
- `scripts/docs-governance.test.ts` 的目录列表与分类措辞断言同步更新。

## 关联

- 扩展：`docs/decisions/0006-document-taxonomy.md`（分类计数；核心原则不变）
- 落地：`docs/governance.md` §7、`docs/audits/README.md`
