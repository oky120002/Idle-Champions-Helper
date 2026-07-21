# Idle Champions 仓库约束

本文件只保留仓库级硬约束与高频入口；更细的代码、样式、文档规则分别下沉到 `docs/product/ai-first-ts-tsx-guidelines.md`、`docs/product/ai-first-css-guidelines.md`、`docs/product/documentation-governance.md`，整站视觉上下文统一写在 `.impeccable.md`。

## 1. 项目边界

- 产品是《Idle Champions of the Forgotten Realms》的个人成长导向阵型决策台；优先做资料查询、限制筛选、阵型编辑、候选英雄校验和方案保存。
- 不做黑盒全自动最优解站；允许按 `docs/modules/planner/` 分阶段建设本地优先、可解释、可验证的自动计划与稳态模拟能力。
- 默认保持静态站、local-first、零预算；未经明确决策，不引入重型后端、数据库、付费 SaaS 或依赖私有接口的长期方案。
- GitHub Pages 兼容是硬约束：任何路由、静态资源或数据加载改动，都要复核 `import.meta.env.BASE_URL` 和 `HashRouter`。

### 1.1 私有用户数据硬边界

- 生产模式（GitHub Pages 静态站）：真实用户数据只能由用户本人在浏览器手动触发同步，前端直连官方只读接口，结果只存当前浏览器 `IndexedDB`；禁止把 `user_id`/`hash`/token/私有快照发到本项目或第三方后端，禁止自动后台同步/刷新/隐式拉取。
- 本地开发：可用开发者自己的私有 token 抓一份用户数据，用于 Vite `serve` 调试和 mock；必须放在被忽略路径（`tmp/private-user-data/**` 或 `*.local`），不得提交、不得进 `public/` 或生产构建。
- 本地与生产隔离：开发快照结构与生产 IndexedDB 兼容但必须分离（不得覆盖真实同步结果）；下游页面读用户画像须经显式数据源选择层，禁止依赖"最后一次导入覆盖同一 current key"的隐式约定。

### 1.2 资源更新与仓库体积硬边界

- 公共资源同步做两层跳过：先看全局资源更新时间，再看单个资源 `sourceGraphic / sourceVersion / path / 本地存在性`；`data:official` 等全量流水线先比 definitions `updatedAt`，未变新整批跳过下载、覆盖和重生成。
- 单个资源脚本若有可持久化的 manifest / collection，就必须基于该元数据做增量复用；禁止无条件清空整个资源目录后全量重下。
- 任何会进入 git 的大体积资源、二进制产物或高频更新文件，都要优先控制数量、体积和改写频率；新增资源流程时，必须显式评估仓库总体大小、单文件大小和历史膨胀风险。
- 非必要不新增会持续膨胀的资源副本、缓存镜像或重复格式导出；能复用现有事实源和稳定 manifest 的，不再额外复制第二份。

### 1.3 数据源格式追溯

- 上游数据格式异常（看似 malformed / 不合法 JSON / 字段缺失 / 分隔符异常）必须先追溯 raw API 源头（`tmp/idle-champions-api/definitions-*.json`）确认根因，区分「数据源格式特性」vs「归一化 bug」；禁止直接在消费层加兜底了事。
- 合理性判据：游戏能正常线上运行 = 源数据大概率没坏。出现「数据有 X 那游戏怎么跑」的矛盾时优先怀疑自己的解析假设或 normalize 脚本，raw 证实前不得下"数据源 bug"结论。
- 数据源格式特性优先在归一化层（`normalize-idle-champions-definitions.mjs`）适配，让消费层拿干净数据；无法在归一化层处理的才退到消费层防御。已确认特性：
  - `upgrade_defines.effect`：有时是 JSON 对象串，CNE 序列化不稳定（合法 JSON 与 effect_string 行末缺逗号的伪 JSON 混存）；`normalizeEffectReference` 提取 effect_string。
  - `effect_defines.targets.tags` 与 `per_hero_expr`：都是英雄布尔表达式（tags 用 shorthand `|`/`^`/`!`/`()`；per_hero_expr 用 functional `||`/`&&`/`HasTag`/`GetStat`/`age`/`hero_id`/`HasAttackDamageType`/`has_base_attack_dmg_type_*`/`has_tag_*`），统一由 `parseHeroPredicate(expr, dialect)`（`src/domain/abilities/heroPredicate.js`）解析到同一 `HeroPredicateAST`，`evalHeroPredicate` 求值；数值表达式（min/max/floor/GetUpgradeAmount 等）返回 null，归 stage 7 stack 计算。

## 2. AI-first 根目标

- 第一目标不是“看起来更工程化”，而是让 100% AI 开发时每次任务读取更少、命中更快、误改更少。
- 判断一次拆分是否成立，只看 3 个指标：常见任务的一跳命中率、无关上下文占比、完成修改所需打开的文件数。
- 不为了行数而拆；如果拆完会让常见修改必须额外打开更多文件，就先保留现状，再换更好的边界。
- 页面层只做编排；规则、状态机、副作用、长链式派生、大型静态映射都要下沉到邻近 `.ts` 模块。
- 允许少量重复，优先避免跨目录、跨层回跳式复用；AI 成本通常高于几行重复代码。

## 3. 默认读取顺序

- TS / TSX：入口页 / 入口组件 -> 状态 Hook -> 区块组件 -> `model.ts` / 动作模块 -> `types.ts` / `constants.ts`
- CSS：`src/styles/global.css` -> 命中的层级目录 -> 命中的叶子文件；不要回扫整棵 `src/styles/`
- 文档：根入口 -> 目录 `README.md` -> 子主题 `README.md` -> 叶子文档；不要预加载整棵 `docs/`
- UI 方向：先读 `.impeccable.md`，再看命中的页面或样式文件；不要靠扫描代码反推视觉策略。

## 4. 结构与命名

- 页面目录优先稳定顺序：`Page.tsx` / `usePageModel.ts` -> `usePageState.ts` -> `sections/` 或局部组件 -> 动作模块 -> `model.ts` -> `types.ts` -> `constants.ts`
- 禁止新增泛化兜底文件：`utils.ts`、`helpers.ts`、`common.ts`、`misc.ts`；公共能力必须按领域命名。
- Barrel 只允许局部、稳定、低扇出的聚合；禁止跨 feature 的全量 re-export。
- 超过 5 个核心文件的 feature，应补一个 40-80 行的局部 `README.md`，只写入口、状态来源、主要子模块和不变量。
- 长字符串、大型静态映射、schema、生成代码、测试夹具可按职责豁免，但要保持单一职责并尽量独立可测。

## 5. 体量预算

### 5.1 TS / TSX

- `.ts`（规则 / model / hook / 数据适配）：<= 240 行默认保留；241-320 行评估；321-480 行应拆；> 480 行必须拆。
- `.tsx`（区块 / 组件）：<= 180 行默认保留；181-260 行评估；261-360 行应拆；> 360 行必须拆。
- 页面入口 `.tsx`：<= 220 行默认保留；221-320 行评估；321-420 行应拆；> 420 行必须拆。
- 测试 / 夹具：<= 260 行默认保留；261-360 行评估；若主要是字面量数据可适度豁免，但要优先抽 builder 或 fixture 模块。

### 5.2 CSS

- `src/styles/shared/`：<= 280 行默认保留；281-400 行评估；401-560 行应拆；> 560 行必须拆。
- `src/styles/app/`：<= 320 行默认保留；321-420 行评估；421-600 行应拆；> 600 行必须拆。
- `src/styles/pages/`、`src/styles/components/`：<= 260 行默认保留；261-380 行评估；381-520 行应拆；> 520 行必须拆。
- 响应式规则若同时改动多个子块，允许集中到当前目录的 `responsive.css`，避免为一次移动端修改打开过多文件。

### 5.3 文档

- 根 / 目录 `README.md`：<= 60 行默认保留；61-90 行评估；91-140 行应拆；> 140 行必须拆。
- 叶子文档：<= 120 行默认保留；121-180 行评估；181-260 行应拆；> 260 行必须拆。
- 同一文档一旦同时包含概览、决策、实现、验证、审计多种读者意图，就算没超行数也应继续拆。

## 6. 样式与 UI

- 整站视觉单一事实源是 `.impeccable.md`；新页面或重构先对齐其中的用户、气质、反模板约束与 anti-slop 守则。
- 默认延续深色战术台方向：克制、可扫描、战术化；强调用结构和层级，不靠模板化卡片墙、彩虹标签、渐变文字或侧边彩条。
- 公共样式保持克制；强视觉表达优先留给当前任务真正需要突出的页面，并兼顾移动端与 GitHub Pages 静态环境。

## 7. 文档与发布

- `AGENTS.md` 只写长期稳定硬约束；`README.md` 写项目概览和高频命令；`docs/README.md` 写总导航；细节只在叶子文档展开。
- 根 `TODO.md`（`auto-todo` 技能维护 canonical 区块）只记录"推进主目标时顺手发现、但与主目标不一致、暂不展开"的问题/优化/性能点；不是主目标执行清单、不是 Ralph 队列、不是模块私有 backlog（模块内任务文档只承载该模块自己的设计/验收/执行约束）。不维护 `docs/todo.md`。
- 技术路线、目录结构、部署、数据契约、页面范围或核心交互变化后，必须同步更新对应文档。
- `main` 只承载已验证、可发布状态；日常开发必须在非 `main` 的 `codex/*` 分支和对应工作树完成。
- 改动后至少做最小充分验证；无法验证时，要明确缺口、风险和建议的下一步验证。

## 8. 测试

- 新增测试文件必须接入运行器，否则等于没测试：`tests/**` 由 vitest 覆盖；`scripts/data/*.test.mjs` 等 `node:test` 格式由 `npm run test:data` 覆盖（已纳入 `test:regression`）。新增其他 `node:test` 测试目录时，同步扩展 `test:data` glob。
- 覆盖率/支持度等"派生统计"若与 scorer 维护平行白名单，优先合并单一来源；跨边界（如 .ts scorer 与 .mjs 脚本）合不了时必须配 keys 同步守护测试（如 `scoringSupportSync.test.ts`）强制两侧一致。

## 9. 构建、预览与截图

- `npm run preview:pages` 只读当前 `dist/`，不反映源码最新改动：截图、人工验收、Playwright 视觉检查前必须先 `npm run build`；拿不准 preview 进程是否对应最新 build 时直接重启，不得把旧 `dist` 当"当前基线"或"修改后效果"，未 build 不得声称画面代表当前源码。
