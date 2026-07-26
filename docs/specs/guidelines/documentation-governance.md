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
- 改名记录（A→B）的 B 侧随后续重构漂移（再改名 / 扩展名 `.mjs→.ts` 迁移 / 文件合并 / B 侧名字从未存在）：每轮文档审计必须对照代码重新核对 B 侧真实存在，不只确认 A→B 改名曾发生；同时区分 JSON collection 名（`loadCollection` fetch `public/data`）与 IndexedDB store key（`localDatabase.ts APP_STORE_NAMES`），不混称。
- `AGENTS.md` 不得复制细则已展开的读取顺序、结构命名、拆分规则、体量预算、样式规则；此类内容只进对应 `docs/specs/guidelines/*` 细则，AGENTS.md 至多留一行指针。

## 7. 文档类型与生命周期

`docs/` 下分五类文档，各有独立目录与生命周期。各类的「怎么写/怎么加」细则在该类目录的 README（就近原则），本节只给跨类型总则。

| 类型 | 目录 | 生命周期 | 核心规则 |
|---|---|---|---|
| Spec 活跃规范 | `specs/` | 随实现重写 | 禁迁移叙事；只描述「现在是什么」；**永不引用 changes/milestone** |
| Reference 参考 | `research/` | 活跃，事实优先 | 不含决策/建议段落；决策指向 `decisions/` |
| Decision 决策 | `decisions/` | append-only | `**Status**: Draft/Accepted/Superseded`；superseded 不删，新 ADR 取代 |
| Change 变更 | `changes/` | `Draft→Accepted→Landed→Archived` | 落地后 `specs/` 更新，change 移 `archive/changes/` |
| Archive 归档 | `archive/` | 冷存储 | 仅考古读取；默认不进入 |

**铁律**：活跃规范（`specs/`）永不引用 `changes/`/milestone/`decisions/` 的历史叙事。规范描述当前现实，不描述「里程碑交付了什么」——这是避免重演 planner milestone 灾难（计划文件污染当前态被全量删除）的核心规则。

## 8. 操作规则

### 怎么组织

六类目录（见 §7）。新增文档时按性质判断：描述现状 → `specs/`；记录决策 → `decisions/`；规划变更/里程碑 → `changes/`；外部事实 → `research/`；历史归档 → `archive/`。命名约定见各目录 README（`decisions/` 用 `NNNN-slug`，`changes/` 用 `YYYY-MM-scope-slug`，`specs/` 用语义命名）。

### 怎么使用

- 改代码 → `specs/modules/<name>/` 或 `specs/guidelines/`
- 查「为什么这样决策」→ `decisions/`
- 做计划 / 里程碑 / 超 long plan → `changes/`
- 确认外部数据源 / 部署 / 测试事实 → `research/`
- 反例：写代码时不读 `changes/`（避免被计划叙事污染当前理解）

### 怎么更新

- 代码改了 → 更新 `specs/` 描述新现状（不写迁移叙事）
- 决策变了 → 新 ADR（`decisions/`，旧的不删，标 `Status: Superseded by NNNN`）
- change 落地 → 更新 `specs/` + change 标 `Status: Landed` → 移 `archive/changes/`

### 怎么添加（模板见各目录 `_template.md`）

- 新模块 → `specs/modules/<name>/{README,design,rules,acceptance}.md`（+ 可选 `contract.md`）
- 新决策 → `decisions/NNNN-<slug>.md`（Status 行 + Decided 日期 + 背景/决策/后果/替代方案）
- 新变更/里程碑 → `changes/YYYY-MM-<scope>-<slug>.md`（Status 行 + 目标/范围/checklist）
