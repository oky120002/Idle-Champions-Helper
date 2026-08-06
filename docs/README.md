# docs/ 文档导航

文档按回答的问题分类，分为七类活跃资产与一类历史归档。改代码前看 `specs/`，查事实看 `research/`，照步骤操作看 `runbooks/`，有新需求想法看 `requirements/`，查审计结论看 `audits/`。

## 文档类型

| 类型 | 目录 | 回答什么 | 何时进入 |
|---|---|---|---|
| Spec 活跃规范 | [`specs/`](./specs/) | 系统现在是什么 | 改代码 / 改规范前 |
| Requirement 需求库 | [`requirements/`](./requirements/) | 将来可能做什么（未承诺） | 有新需求想法但尚未确认启动 |
| Research 调研 | [`research/`](./research/) | 外部事实是什么 | 确认数据源 / 部署 / 测试事实 |
| Decision 决策 | [`decisions/`](./decisions/) | 为什么这样选 | 做技术选型时（ADR） |
| Plan 计划 | [`plans/`](./plans/) | 接下来按什么步骤改 | 确认要做、准备执行时 |
| Runbook 操作手册 | [`runbooks/`](./runbooks/) | 当前怎样操作 | 开发、测试、部署、排障 |
| Audit 审计 | [`audits/`](./audits/) | 验证/审计了什么 | 做深度审计或查审计结论时 |
| Archive 归档 | [`archives/`](./archives/) | 过去发生了什么 | 考古（默认不进入） |

## 任务→目录速查

- 改模块功能 → `specs/modules/<name>/`
- 查开发规范 → `specs/guidelines/`
- 查产品定义 → `specs/product/`
- 有新需求想法 → `requirements/`
- 查决策依据 → `decisions/`
- 做执行计划 / 里程碑 → `plans/`
- 确认外部事实 → `research/`
- 执行当前操作或排障 → `runbooks/`
- 查审计结论 / 做深度审计 → `audits/`

## 怎么写 / 怎么加

各类文档的命名与生命周期见对应目录 README；ADR 和 Plan 另有目录内模板：

- [怎么写提案](./requirements/README.md)
- [怎么写 ADR](./decisions/README.md)
- [怎么做变更 / 里程碑](./plans/README.md)
- [怎么写小模块](./specs/modules/README.md)
- [怎么写调研](./research/README.md)
- [怎么写操作手册](./runbooks/README.md)
- [怎么写审计报告](./audits/README.md)

完整治理规则（文档类型、生命周期、操作规则、体量预算、拆分维度）见 [`governance.md`](./governance.md)。

## 默认读取顺序

`AGENTS.md` → 根 `README.md` → `docs/README.md`（本页）→ 目录 README → 叶子文档。
