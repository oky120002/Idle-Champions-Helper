# docs/ 文档导航

文档按职责分为六类活跃资产与历史归档。改代码前看 `specs/`，查事实看 `research/`，照步骤操作看 `runbooks/`。

## 文档类型

| 类型 | 目录 | 何时进入 |
|---|---|---|
| Spec 活跃规范 | [`specs/`](./specs/) | 改代码 / 改规范前（描述「现在是什么」） |
| Research 调研 | [`research/`](./research/) | 确认外部数据源 / 部署 / 测试事实 |
| Decision 决策 | [`decisions/`](./decisions/) | 查「为什么这样决策」（ADR） |
| Change 变更 | [`changes/`](./changes/) | 做计划 / 里程碑 / 超 long plan |
| Runbook 操作手册 | [`runbooks/`](./runbooks/) | 开发、测试、部署、维护和排障 |
| Archive 归档 | [`archive/`](./archive/) | 考古（默认不进入） |

## 任务→目录速查

- 改模块功能 → `specs/modules/<name>/`
- 查开发规范 → `specs/guidelines/`
- 查产品定义 → `specs/product/`
- 查决策依据 → `decisions/`
- 做新计划 / 里程碑 → `changes/`
- 确认外部事实 → `research/`
- 执行当前操作或排障 → `runbooks/`

## 怎么写 / 怎么加

各类文档的命名、生命周期与模板见对应目录 README：

- [怎么写 ADR](./decisions/README.md)
- [怎么做变更 / 里程碑 / 超 long plan](./changes/README.md)
- [怎么写小模块](./specs/modules/README.md)
- [怎么写调研](./research/README.md)
- [怎么写操作手册](./runbooks/README.md)

完整治理规则（文档类型、生命周期、操作规则、体量预算、拆分维度）见 [`specs/guidelines/documentation-governance.md`](./specs/guidelines/documentation-governance.md)。

## 默认读取顺序

`AGENTS.md` → 根 `README.md` → `docs/README.md`（本页）→ 目录 README → 叶子文档。
