# decisions/ —— 决策记录（ADR）

append-only。每个决策一个文件，编号 NNNN。**决策变了新开 ADR，旧的不删**（标 `Status: Superseded by NNNN`）。

## 命名

`NNNN-<short-slug>.md`（0001 起，补零 4 位）。

**编号冲突**：分支合并时若发现编号已被占用（如另一分支已用该号），顺延到下一个未占用的编号。

## Status 生命周期

- `Draft`：起草中，未确认
- `Accepted`：已采纳（specs/ 据此实现）
- `Superseded by NNNN`：被新 ADR 取代（**不删**，保留决策史）

## 文件结构

见 [`_template.md`](./_template.md)：Status 行 + Decided 日期 + 背景/决策/后果/替代方案/关联。

## 何时写 ADR

- 做了有长期影响的技术/产品选择（如「用 IndexedDB 不用 Postgres」「planner 用 carryDps 不用启发式 score」）
- 在多个方案里选了一个，未来可能被质疑「为什么这样」
- 决策影响多个模块、需要追溯依据

## 何时不写

- 显而易见的实现细节 → 直接写 `specs/`
- 当前操作、维护或排障步骤 → `runbooks/`
- 临时调试/问题排查 → `archives/investigations/`
- 单纯的事实调研（无决策）→ `research/`

## 与其他目录的关系

- 依据来自 `research/`（事实），不在 ADR 里重展调研
- 落地到 `specs/`（规范描述最终态，引用 ADR 作为决策依据）
- 变更计划在 `plans/`（change 引用相关 ADR）
