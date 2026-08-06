# 文档治理方案

- 目标：让 `AGENTS.md`、`README.md` 和 `docs/` 各司其职，并按读者意图渐进式加载，减少重复、失效和 token 浪费。

## 1. 单一事实源

- `AGENTS.md`：仓库级长期稳定硬约束。
- `README.md`：项目概览、高频命令、高频入口。
- `docs/README.md`：`docs/` 总导航；只回答“下一步去哪读”。
- 目录 / 子主题 `README.md`：局部索引，只负责分流。
- 叶子文档：规则、调研、实现、验证、审计的唯一展开位置。
- `.impeccable.md`：整站视觉上下文、UI 审查结论与 anti-slop 约束。

## 2. 默认读取顺序

`README.md` -> `docs/README.md` -> 目录 `README.md` -> 子主题 `README.md` -> 叶子文档

高频、稳定、可预判命中的规则直接打开叶子文档；只有低频或多分叉主题才先走索引。

## 3. 体量预算

| 类别 | 默认保留 | 评估拆分 | 应拆 | 必须拆 |
| --- | --- | --- | --- | --- |
| 根 / 目录 `README.md` | <= 60 行 | 61-90 行 | 91-140 行 | > 140 行 |
| 叶子文档 | <= 120 行 | 121-180 行 | 181-260 行 | > 260 行 |

行数只是警戒线；只要一个文档同时承载多种读者意图，就算没超行数也应继续拆。

## 4. 拆分维度

优先按读者意图拆，而不是平均切字数：

- 概览 / 入口
- 约束 / 决策
- 实现 / 操作
- 验证 / 审计
- 经验 / 案例
- 引用 / 证据

## 5. 低 token 写法

- 先写结论、边界、当前状态，再写依据。
- 同一事实只展开一次；其他入口只保留一句摘要和路径。
- 一个主题只保留一个目录 `README.md` 入口；不保留旧路径短入口页或中间跳转层。
- 父索引只列主题，不平铺全量叶子文档。
- 能用表格、短列表或代码路径表达的，不写长段解释。
- 不保留迁移叙事：文档只写当前态，历史对比、版本演进（v1 / v2、第 N 轮治理）、已完成的迁移过程和旧实现描述不写入；根因与数据源格式特性属于当前态，保留。

## 6. 触发更新

- 技术路线、部署、路由、数据目录、核心交互变化。
- 新增 / 删除文档，或发现多个入口重复维护同一事实。
- 某目录重新膨胀，导致为一个问题被迫吞下多个无关问题。
- 文档出现过期命令、错误路径、绝对路径或与代码冲突的描述。
- 改名记录（A→B）的 B 侧可能因再次改名、扩展名变化、文件合并或错误记录而漂移：每轮文档审计必须对照代码重新核对 B 侧真实存在，不只确认 A→B 改名曾发生；同时区分 JSON collection 名（`loadCollection` fetch `public/data`）与 IndexedDB store key（`localDatabase.ts APP_STORE_NAMES`），不混称。
- `AGENTS.md` 不得复制细则已展开的读取顺序、结构命名、拆分规则、体量预算、样式规则；此类内容只进对应 `docs/specs/guidelines/*` 细则，AGENTS.md 至多留一行指针。

## 7. 文档类型与生命周期

`docs/` 下有七类活跃资产与一类历史归档，各有独立目录与生命周期。各类的「怎么写/怎么加」细则在对应目录 README，本节只给跨类型总则。

| 类型 | 目录 | 回答什么 | 生命周期 | 核心规则 |
|---|---|---|---|---|
| Spec 活跃规范 | `specs/` | 系统现在是什么 | 随实现重写 | 禁迁移叙事；只描述「现在是什么」；**永不引用 plans/milestone** |
| Requirement 需求 | `requirements/` | 将来可能做什么 | 落地/否决后立即归档 | 有明确需求描述和暂缓理由；不做排期；被接受后在 `plans/` 新建执行计划，提案保留至实现完成 |
| Research 调研 | `research/` | 外部事实是什么 | 活跃，事实优先 | 不含决策/建议段落；决策指向 `decisions/` |
| Decision 决策 | `decisions/` | 为什么这样选 | append-only | `**Status**: Draft/Accepted/Superseded`；推翻→新 ADR，细节更新→改原文（见 `decisions/README.md`） |
| Plan 计划 | `plans/` | 接下来按什么步骤改 | `Accepted→Landed` | 确认要做时才创建；落地后 `specs/` 更新，保留 `Landed` 状态并移入 `archives/plans/` |
| Runbook 操作手册 | `runbooks/` | 当前怎样操作 | 随操作更新 | 写当前可执行步骤；不写事故经过或方案讨论 |
| Audit 审计 | `audits/` | 验证/审计了什么 | 时点快照，保留作基线 | 一次性结构化排查；结论分流到对应类型；是时点快照，随项目演进过时属预期，当前态查 `specs/` |
| Archive 归档 | `archives/` | 过去发生了什么 | 冷存储 | 仅考古读取；默认不进入 |

**铁律**：活跃规范不引用 `plans/` 或里程碑，不描述「某次交付了什么」。Spec 可以链接 ADR 作为当前选择的依据，但不得复述决策历史。Requirement 和 Plan 是两个不同阶段：Requirement 是需求意图（可能永远不做），Plan 是执行计划（确认要做）。Requirement 被接受后在 `plans/` 新建对应执行计划，提案保留至实现完成；**一旦实现落地或被否决，必须立即将需求文件移入 `archives/requirements/` 并标记终态，禁止留在 `requirements/` 堆积**。多子项需求部分落地时原地更新剩余子项，全部终态后才整体归档；重复或无效提案直接删除，不归档。

## 8. 操作规则

### 怎么组织

新增文档按它回答的问题分类：当前是什么 → `specs/`；将来可能做什么 → `requirements/`；事实是什么 → `research/`；为什么选择 → `decisions/`；接下来按什么步骤改 → `plans/`；现在怎样操作 → `runbooks/`；过去发生什么 → `archives/`。命名约定见各目录 README。

### 怎么使用

- 改代码 → `specs/modules/<name>/` 或 `specs/guidelines/`
- 有新需求想法 → `requirements/`（一个文件一个有边界的需求）
- 查「为什么这样决策」→ `decisions/`
- 做执行计划 / 里程碑 → `plans/`（确认要做时才创建）
- 确认外部事实或数据证据 → `research/`
- 执行开发、测试、部署、维护或排障 → `runbooks/`
- 反例：写代码时不读 `plans/`（避免被计划叙事污染当前理解）

### 怎么更新

- 代码改了 → 更新 `specs/` 描述新现状（不写迁移叙事）
- 决策变了 → 新 ADR（`decisions/`，旧的不删，标 `Status: Superseded by NNNN`）
- plan 落地 → 更新 `specs/` + plan 标 `Status: Landed` → 移 `archives/plans/`；归档位置不新增状态
- 需求落地 → 更新 `specs/` 为新现状 + 需求文件加终态头 → 移 `archives/requirements/`；否决只加终态头移归档；重复或无效提案直接删除
- 操作变化 → 原地更新 `runbooks/`；一次性事故证据另存 `archives/investigations/`

### 怎么添加

- 新模块 → `specs/modules/<name>/{README,design,rules,acceptance}.md`（+ 可选 `contract.md`）
- 新需求提案 → `requirements/<scope>-<slug>.md`，一个文件一个有边界的需求
- 新调研 → 在 `research/` 的现有主题入口下新增按事实命名的叶子文档；新主题先建 README 分流
- 新决策 → `decisions/NNNN-<slug>.md`，使用该目录的 `_template.md`
- 新执行计划/里程碑 → `plans/YYYY-MM-<scope>-<slug>.md`，使用该目录的 `_template.md`（提案被接受、准备执行时才创建）
- 新操作手册 → `runbooks/<task>.md`，写前提、命令、判断和验证
- 新审计报告 → `audits/<topic>-audit.md`（完整审计）或 `<topic>-recon.md`（侦察，真缺口 <2 不展开）
- 新历史记录 → 仅从已完成的 Plan、Investigation 或已终态的 Requirement 移入 `archives/`，不为当前工作新建归档文档

有 `_template.md` 的目录，新建文档必须从模板结构开始写。Decision 和 Plan 使用各自目录的 `_template.md`（ADR 有 Nygard 业界共识、Plan 多阶段 checklist 刚需）；Spec、Requirement、Research、Runbook 与 Archive 无统一模板共识，以相邻 README 的职责约定为准，不为形式化而强加模板。

## 9. 全量索引

本文件（§1-§8）给跨类型总则。各类型细则、可执行约束与操作流程分布在以下文件——治理变更须同步排查全表：

| 位置 | 管什么 |
|---|---|
| [`AGENTS.md`](../AGENTS.md)「文档落库」 | 仓库级落库判据表 + 需求归档铁律 |
| [`README.md`](./README.md) | 类型导航表、任务→目录速查 |
| [`runbooks/documentation-maintenance.md`](./runbooks/documentation-maintenance.md) | 新增/改名文档 5 步操作 + 治理测试命令 |
| [`specs/README.md`](./specs/README.md) | 规范核心规则：只描述现在、禁迁移叙事、禁引用 plans/milestone |
| [`specs/modules/README.md`](./specs/modules/README.md) | 模块标准结构：README + design + rules + acceptance（+ contract） |
| [`specs/guidelines/README.md`](./specs/guidelines/README.md) | guidelines 写作规则：只描述当前、原地更新、代码是事实源 |
| [`specs/guidelines/design/README.md`](./specs/guidelines/design/README.md) | design 子目录入口：视觉规范何时读/何时补 |
| [`specs/product/README.md`](./specs/product/README.md) | product 写作规则：描述产品现状、不写里程碑/变更叙事 |
| [`requirements/README.md`](./requirements/README.md) | 需求库规则：与 plans 区别、终态标记格式、落地/否决后立即归档 |
| [`plans/README.md`](./plans/README.md) | 计划规则：change/milestone 类型、Status 生命周期、落地流程、铁律 |
| [`decisions/README.md`](./decisions/README.md) | ADR 规则：命名补零、append-only、Status 生命周期 |
| [`research/README.md`](./research/README.md) | 调研规则：只记事实、不含决策/建议、带数据快照日期 |
| [`runbooks/README.md`](./runbooks/README.md) | 手册写作规则：可复现前提/命令/判断/验证 |
| [`audits/README.md`](./audits/README.md) | 审计报告规则：命名（-audit/-recon）、与其他目录关系、保留作基线 |
| [`archives/README.md`](./archives/README.md) | 归档总规则：子目录、何时移入、进入后不再更新 |
| [`archives/requirements/README.md`](./archives/requirements/README.md) | 需求归档规则：终态标记、何时进入 |
| [`scripts/docs-governance.test.ts`](../scripts/docs-governance.test.ts) | 可执行约束：目录结构、断链、体量、迁移叙事、Status |
| [`decisions/0006-document-taxonomy.md`](./decisions/0006-document-taxonomy.md) | 文档分类决策依据（ADR） |
