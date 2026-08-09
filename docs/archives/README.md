# archives/ —— 历史归档

冷存储。**默认不参考**；仅在考古（复现旧问题、追溯变更史）时读取。

## 子目录

- `investigations/`：历史问题排查记录（已解决/已定位的 past events）
- `plans/`：已落地的执行计划（从 `plans/` 移入，保留里程碑与变更史）
- `requirements/`：已落地或已否决的需求提案（从 `requirements/` 移入）
- `audits/`：一次性审计结论与逐项追踪证据，入口见 `audits/README.md`

## 规则

- 进入 archive 的文档**不再更新**（如需重新决策，新开 `decisions/` ADR 或 `plans/` 执行计划）
- 查当前态 → `specs/`（功能）或 `research/`（事实）
- 查决策史 → `decisions/`（ADR 含 `Superseded` 记录，不进 archive）
- 查「某里程碑做了什么」→ `archives/plans/`
- 查「某旧问题怎么解的」→ `archives/investigations/`
- 查「某需求做没做 / 为何否决」→ `archives/requirements/`

## 何时移入

- investigations：问题解决并验证后，从主结构移入
- plans：状态变 `已落地` 后移入 `archives/plans/`
- requirements：需求实现落地或被否决后立即移入；重复/无效提案直接删除不归档
- 不主动清理（历史可追溯），但也不让它在主结构占位
