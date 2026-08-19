# Idle Champions 仓库约束

本文件是项目根规则文件，所有文档与代码必须服从，不得违反。只保留对整个项目生效的仓库级硬约束；模块级约束（私有用户数据、数据管线增量跳过、数据源格式追溯等）在各模块/专题文档展开，见下方索引。

- TS/TSX：`docs/specs/guidelines/ai-first-ts-tsx.md`
- CSS：`docs/specs/guidelines/ai-first-css.md`
- 文档：`docs/governance.md`
- 国际化：`docs/specs/guidelines/i18n-messages.md`
- 统一语言（游戏术语 ↔ 代码标识符）：`CONTEXT.md`
- 测试规范（编写或修改任何测试用例前必须同时加载）：组织与运行门禁 `docs/specs/guidelines/testing.md`；方法论与跨边界契约 `docs/specs/guidelines/testing-methodology.md`
- 数据归一化管线（资源同步 + normalize/build 增量跳过、数据源格式追溯）：`docs/specs/guidelines/data-normalization.md`
- 私有用户数据：`docs/specs/modules/user-data/`
- 当前操作手册：`docs/runbooks/README.md`
- 整站视觉（深色战术台方向、克制原则、移动端与 Pages 适配）：`.impeccable.md`
- 运维脚本执行门禁（高风险脚本默认禁止执行，仅用户显式指示才允许）：`scripts/ops/AGENTS.md`

## 项目边界

- 产品是 Idle Champions 最佳阵型自动推算工具：资料查询、限制筛选、阵型编辑、自动推算、方案保存；planner 是本地优先、可解释的最佳阵型推算引擎，目标是自动给出当前条件下的最优配置，过程可追溯、结果可验证（`docs/specs/modules/planner/`）。
- 默认静态站、local-first、零预算；未经决策不引入重型后端/数据库/付费 SaaS/依赖私有接口的长期方案。
- GitHub Pages 兼容是硬约束：路由、静态资源、数据加载改动都要复核 `import.meta.env.BASE_URL` 和 `HashRouter`。

## 仓库体积

- 控制进 git 的大体积/二进制/高频更新文件的数量、体积与改写频率；新增资源流程显式评估总体积、单文件大小、历史膨胀风险；非必要不新增资源副本、缓存镜像、重复格式导出。

## AI-first 根目标

- 第一目标是让 100% AI 开发时每次任务读取更少、命中更快、误改更少，不是「看起来更工程化」；拆分是否成立只看 3 指标（常见任务一跳命中率、无关上下文占比、完成修改需打开的文件数），拆完若让常见修改多开文件就先保留现状，不为行数而拆。指标定义与体量预算见 `docs/governance.md`。

## 发布纪律

- 根 `TODO.md`（`auto-todo` canonical 区块）只记「推进主目标时顺手发现、但与主目标不一致、暂不展开」的问题/优化/性能点；不是执行清单、Ralph 队列或模块私有 backlog；不维护 `docs/todo.md`。
- `main` 只承载已验证可发布状态，日常开发在非 `main` 分支与对应工作树完成；改动后至少做最小充分验证，无法验证时明确缺口、风险和下一步。

## 文档落库

文档落库前必须先判断它回答什么问题，按下表归位；不确定时看 `docs/README.md` 分类表，不凭直觉落库：

| 回答什么 | 去哪 |
|---|---|
| 系统现在是什么 | `docs/specs/` |
| 将来可能做什么（未承诺） | `docs/requirements/` |
| 外部事实是什么 | `docs/research/` |
| 为什么这样选 | `docs/decisions/` |
| 接下来按什么步骤改（即将执行） | `docs/plans/` |
| 怎样操作 | `docs/runbooks/` |
| 验证/审计了什么 | `docs/audits/` |

关键区分：`requirements/` 是需求意图（可能永远不做），`plans/` 是执行计划（确认要做）。提案被接受后在 `plans/` 新建执行计划，提案保留至实现完成；**需求一旦落地或被否决，必须立即移入 `archives/requirements/` 并标记终态，禁止留在 `requirements/` 堆积**。详细分类规则、命名约定和生命周期见 `docs/README.md` 与 `docs/governance.md`。

## 任务分级与计划

- 大型任务开工前必须先在 `docs/plans/` 落库执行计划，随后按计划推进；偏离时同步更新。
- 大型任务收尾（非可选）：计划 checklist 全完成且验证通过后，更新 `specs/` 描述新现状 → plan 标 `已落地` 移 `archives/plans/` → 关联需求加终态移 `archives/requirements/`（细节见 `governance.md` §8）。
- 小型任务可直接开发，无需计划落库。
- 大型/小型由执行智能体自行判断（跨多模块、多步骤、影响面广、需审计追溯倾向大型）；拿不准按大型处理。

## 测试与构建

- 测试 co-located（单测/组件/夹具就近被测模块同目录，E2E 与全局 setup 集中 `tests/`），必须接入运行器并同步扩展对应 glob，禁止游离。派生统计（覆盖率/支持度）优先合并单一来源；跨边界（src 侧 scorer 与 scripts 侧脚本）无法合并时必须配 keys 同步守护测试强制一致。glob、集中例外、类型门控见 `testing.md`；真实产物、schema、异常分类与契约见 `testing-methodology.md`。
- `npm run preview:pages` 只读当前 `dist/`，不反映源码最新改动：截图、验收、Playwright 视觉检查前必须先 `npm run build`；拿不准 preview 进程是否对应最新 build 时直接重启，不得把旧 `dist` 当「当前基线」或「修改后效果」。

## 协作方式

- 善用子智能体：边界清晰、可独立验证、范围不冲突的任务主动拆分并行开启，不犹豫（比全局默认更积极）；复杂重构、需共享上下文或文件强关联的仍由主智能体串行处理。

## 沟通用语

面向用户的对话文本（非代码标识符、注释）遵循：

- 默认简体中文，优先用游戏术语和通俗易懂的词汇，少用开发语言；**禁止直接搬用代码里的英文 key**（如 `slot_escort`、`forcedHeroes`、`scenarioRef`）——先用游戏术语或中文讲清概念，必要时括注代码标识符方便定位。
- 引用代码位置用文件路径（如 `build-models.ts:208`）；引用游戏 JSON 字段时说明它在游戏中对应什么，不假设用户认识该字段名。
- 本规则只约束面向用户的对话文本；代码内的函数名、变量名、类型名、注释保持英文（遵循代码规范），游戏 JSON 字段名按数据源事实使用。

## 统一语言（CONTEXT.md）

- 根 `CONTEXT.md` 是统一语言术语表，只记领域术语定义与别名（游戏术语 ↔ 代码标识符映射）。
- 术语确认时即时更新，不批量；新任务涉及新概念时先查 `CONTEXT.md` 建立理解。
- 用户使用冲突术语时：能从上下文自行消解的直接消解更新；无法消解的交用户确认。
