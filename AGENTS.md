# Idle Champions 仓库约束

本文件只保留仓库级硬约束；代码/样式/文档的默认读取顺序、结构命名、拆分规则、体量预算等细节已在下列专题文档展开：

- TS/TSX：`docs/specs/guidelines/ai-first-ts-tsx.md`
- CSS：`docs/specs/guidelines/ai-first-css.md`
- 文档：`docs/specs/guidelines/documentation-governance.md`
- 测试：`docs/specs/guidelines/testing.md`
- 数据归一化管线：`docs/specs/guidelines/data-normalization.md`
- 当前操作手册：`docs/runbooks/README.md`
- 整站视觉（深色战术台方向、克制原则、移动端与 Pages 适配）：`.impeccable.md`

## 1. 项目边界

- 产品是 Idle Champions 个人成长导向阵型决策台：资料查询、限制筛选、阵型编辑、候选校验、方案保存；不做黑盒全自动最优解，planner 是本地优先、可解释、可验证的推荐引擎（`docs/specs/modules/planner/`）。
- 默认静态站、local-first、零预算；未经决策不引入重型后端/数据库/付费 SaaS/依赖私有接口的长期方案。
- GitHub Pages 兼容是硬约束：路由、静态资源、数据加载改动都要复核 `import.meta.env.BASE_URL` 和 `HashRouter`。

### 1.1 私有用户数据

- 生产（GitHub Pages）：真实用户数据只由用户本人在浏览器手动触发同步，前端直连官方只读接口，只存当前浏览器 `IndexedDB`；禁止把 `user_id`/`hash`/token/快照发到本项目或第三方后端，禁止自动后台同步/刷新/隐式拉取。
- 本地开发：私有 token 仅用于 Vite `serve` 调试/mock，放被忽略路径（`tmp/private-user-data/**` 或 `*.local`），不提交、不进 `public/` 或生产构建；开发快照与生产 IndexedDB 兼容但必须分离，下游读用户画像须经显式数据源选择层，禁止"最后一次导入覆盖同一 current key"的隐式约定。

### 1.2 资源更新与仓库体积

- 两层跳过：先比全局资源更新时间，再比单资源 `sourceGraphic`/`sourceVersion`/`path`/本地存在性；`data:official` 等全量流水线先比 definitions `updatedAt`，未变整批跳过下载、覆盖、重生成。单资源脚本有可持久化 manifest/collection 就必须基于它增量复用，禁止无条件清空目录后全量重下。
- normalize/build 数据管线增量跳过：`normalizeDefinitionsSnapshot` 与 `buildModels` 对比 raw `checksum`（稳定数据指纹，优先；游戏数据没变时不变）或 `current_time`（fallback）与产物记录、以及数据管线源码指纹 `pipelineHash`（`scripts/data` 下非 test 的 .ts + normalize/fetch/build 三入口的 sha256）——raw 数据未变（checksum 同）且逻辑未变则跳过重生成。`checksum` 优先于 `current_time`：后者每次 fetch 单调递增（即使游戏数据没变），曾导致空重写（~191 产物纯时间戳噪音）。`pipelineHash` 自动检测 `scripts/data` + 三入口的源码改动（无需手动 force）；**但 `src/domain/abilities` 下的归一化逻辑**（`signalSemantics` 等，被 `effect-helpers`/`specialization-catalog` 导入为 build 依赖）**不在覆盖内**——改后须 `FORCE_DATA_REBUILD=1` 强制重建（hero-abilities.json + specialization-catalog.json 均消费 signalSemantics），否则产物保持旧逻辑（见 `docs/runbooks/verify-formation-simulator.md`「归一化改动注意」）。`FORCE_DATA_REBUILD=1` 亦作通用逃生口。fetch 受限于「必须下载才知 current_time」，无法下载前跳过。
- 控制进 git 的大体积/二进制/高频更新文件的数量、体积与改写频率；新增资源流程显式评估总体积、单文件大小、历史膨胀风险；非必要不新增资源副本、缓存镜像、重复格式导出。

### 1.3 数据源格式追溯

- 上游格式异常（malformed / 非法 JSON / 字段缺失 / 分隔符异常）先追溯 raw 源头（`tmp/idle-champions-api/definitions-*.json`），区分「数据源格式特性」vs「归一化 bug」，禁止直接在消费层加兜底；合理性判据：游戏能正常线上运行 = 源数据大概率没坏，出现矛盾优先怀疑自己的解析假设或 normalize 脚本，raw 证实前不得下"数据源 bug"结论。
- 格式特性优先在归一化层（`normalize-idle-champions-definitions.ts`）适配；已确认特性见 `docs/research/data/game-data-source/format-quirks.md`。

## 2. AI-first 根目标

- 第一目标是让 100% AI 开发时每次任务读取更少、命中更快、误改更少，不是"看起来更工程化"；拆分是否成立只看 3 指标（常见任务一跳命中率、无关上下文占比、完成修改需打开的文件数），拆完若让常见修改多开文件就先保留现状，不为行数而拆。结构命名、拆分规则、体量预算见上述细则。

## 3. 发布纪律

- 根 `TODO.md`（`auto-todo` canonical 区块）只记"推进主目标时顺手发现、但与主目标不一致、暂不展开"的问题/优化/性能点；不是执行清单、Ralph 队列或模块私有 backlog；不维护 `docs/todo.md`。
- `main` 只承载已验证可发布状态，日常开发在非 `main` 分支与对应工作树完成；改动后至少做最小充分验证，无法验证时明确缺口、风险和下一步。

## 4. 测试与构建

- 测试遵循 co-located 规范（`docs/specs/guidelines/testing.md`）：单测/组件/夹具就近放被测模块同目录，E2E 与全局 setup 集中 `tests/`；新增测试必须接入运行器（vitest 覆盖 `src/**/*.test.{ts,tsx}` 与 `scripts/**/*.test.ts`、playwright 覆盖 `tests/e2e/`），新增测试目录同步扩展对应 glob，禁止游离。
- 派生统计（覆盖率/支持度）若与 scorer 平行白名单，优先合并单一来源；跨边界（src 侧 scorer 与 scripts 侧脚本）合不了时必须配 keys 同步守护测试（如 `scoringSupportSync.test.ts`）强制一致。
- `npm run preview:pages` 只读当前 `dist/`，不反映源码最新改动：截图、验收、Playwright 视觉检查前必须先 `npm run build`；拿不准 preview 进程是否对应最新 build 时直接重启，不得把旧 `dist` 当"当前基线"或"修改后效果"。

## 5. 沟通用语

面向用户的对话文本（非代码标识符、注释）遵循：

- 默认简体中文，优先用游戏术语描述概念，可适当白话一点表达。尽可能让人读能读懂；**禁止直接搬用代码里的英文 key**（如 `slot_escort`、`forcedHeroes`、`scenarioRef`）——这些多为程序员自定的标识符，常与游戏实际概念有偏差，直接用易误导用户。规则：先用游戏术语或中文讲清概念，必要时在括号标注对应代码标识符方便定位。
- 引用代码位置用文件路径（如 `build-models.ts:208`）；引用游戏 JSON 字段时说明它在游戏中对应什么，不假设用户认识该字段名。
- 本规则只约束面向用户的对话文本；代码内的函数名、变量名、类型名、注释保持英文（遵循代码规范），游戏 JSON 字段名按数据源事实使用。
