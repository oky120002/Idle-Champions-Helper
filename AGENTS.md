# Idle Champions 仓库约束

本文件只保留仓库级硬约束与按需加载入口；项目介绍、常用命令和完整文档索引分别放在 `README.md` 与 `docs/README.md`。

## 1. 项目边界

- 目标是《Idle Champions of the Forgotten Realms》个人成长导向的阵型决策台；优先做资料查询、限制筛选、阵型编辑、候选英雄校验和方案保存。
- 不做全自动最优阵容求解器或完整模拟器；推荐逻辑保持“规则过滤 + 模板推荐 + 可解释评分”。
- 当前产品保持静态站、local-first、零预算约束；未经明确决策，不引入重型后端、数据库、付费 SaaS 或依赖私有接口的长期方案。
- GitHub Pages 兼容是硬约束：涉及静态资源、数据加载或路由时，先确认 `import.meta.env.BASE_URL` 与 `HashRouter` 约束没有被破坏。

## 2. 开发与发布

- `main` 只承载已验证、可发布状态；日常开发必须在非 `main` 的 `codex/*` 分支和对应工作树完成。
- 当前工作树如果位于 `main`，或分支与任务明显无关，应新开工作树；只有任务连续且分支高度相关时才复用。
- 默认按 TDD 或至少“先补验证、后改实现”的方式推进；改动后执行最小充分验证，无法验证时明确缺口与风险。
- 合并回 `main` 前必须完成当前可用的最大全量回归；未验证完成的结果不要进入 `main`。
- 仓库默认按 AI-first 方式组织 TS / TSX：优先降低单次任务的上下文体积、误改风险和 token 消耗，详细规则见 `docs/product/ai-first-ts-tsx-guidelines.md`。
- 样式默认按 AI-first CSS 分层与渐进式读取组织；入口、分层、文件预算与拆分规则见 `docs/product/ai-first-css-guidelines.md`。
- 核心规则、状态转换和副作用不要直接写死在页面层；新增模块需保持可隔离测试。
- 页面组件默认只做编排；大型规则、映射表、状态机、长链式数据变换应拆到 `model.ts`、`useXxx.ts`、`types.ts` 或相邻 `.ts` 文件。
- 新增或重构 feature 时，优先使用稳定加载顺序：入口页 / 入口组件 -> 状态 Hook -> `sections/` -> `model.ts` -> `types.ts` -> `constants.ts`。
- 禁止新增泛化兜底文件：`utils.ts`、`helpers.ts`、`common.ts`、`misc.ts`；公共能力要按领域命名、按职责落位。
- Barrel 只允许局部、稳定、低扇出的聚合；禁止跨 feature 的全量 re-export 扩散。
- 形成可独立识别的阶段性成功后及时提交；提交信息使用 `type:summary`，保持单提交单目标。
- 远端 GitHub 交互优先 `gh` / `gh api`；凡是改动了远端状态，必须同步本地分支、工作树和相关说明。
- `.ts` 单一职责文件在 300 行内默认可保留；超过 300 行应评估拆分，超过 450 行应拆，超过 700 行必须拆。
- `.tsx` 单一职责文件在 250 行内默认可保留；超过 250 行应评估拆分，超过 350 行应拆，超过 500 行必须拆；页面级入口可放宽到 400 行，前提是区块、状态和模型层已外置。
- 任何 TS / TSX / CSS 拆分规则调整，都必须先证明能降低单次任务的总 token 成本；判断标准是常见任务需要打开的文件数、每个文件里的无关内容和一跳命中率，而不是单纯把文件拆得更小。
- 长字符串、大型常量 / 枚举、schema、静态映射表、生成代码，或必须保持高内聚的复杂算法 / 逻辑可按职责适度豁免，但仍应保证可读性与可测试性。

## 3. 文档约束

- 节约 token 是默认目标：文档一律按“渐进式加载”组织，避免为 1 个问题预读整组资料。
- 单一事实源：`AGENTS.md` 写硬规则；`README.md` 写概览和高频入口；`docs/README.md` 写总导航；目录 / 子主题 `README.md` 只做分流；细节只写在叶子文档。
- 默认读取顺序：根入口 -> 目录 `README.md` -> 子主题 `README.md` -> 叶子文档；不要预加载整棵 `docs/`。
- 高频、稳定、可预判命中的规则直接指向叶子文档；只有低频、分叉或目标不明确的主题才通过 `README.md` 索引分流。
- 入口页只回答“先看哪篇 / 什么时候看”；不堆背景、长命令或重复结论。
- 同一事实只展开一次；其他位置只保留一句结论 + 项目相对路径。旧路径优先保留为短入口页，避免断链。
- 一个主题只要同时混有概览、决策、实现、验证、审计，就继续拆；目录一旦需要解释“先看哪篇”，就补 `README.md`。
- 技术路线、部署方式、目录结构、命令、数据结构或核心范围变化时，必须同步相关文档；调研 / 排查结论沉淀到 `docs/`，流程类摘要补到 `docs/troubleshooting-log.md`。
- 文档里引用仓库文件一律使用项目相对路径；新模块或大范围交互改动先补对应设计稿，落位遵循 `docs/README.md`。

## 4. 按需加载

- 不预加载整棵 `docs/`；先读入口，再只开当前问题对应的最小文档。
- 优先读索引，不直接扫长文；能定位到叶子文档时，不回头加载整组主题。
- 高频稳定规则直接读叶子，不先经过索引：
  - 文档治理：`docs/product/documentation-governance.md`
  - TS / TSX：`docs/product/ai-first-ts-tsx-guidelines.md`
  - CSS：`docs/product/ai-first-css-guidelines.md`
  - 移动端：`docs/product/mobile-compatibility-guidelines.md`
- 低频或分叉主题再走索引：
  - `docs/` 总入口与落位规则：`docs/README.md`
  - 产品范围与路线：`docs/product/README.md`
  - 数据、部署与测试：`docs/research/README.md`
  - 模块设计：`docs/modules/README.md`
  - 排查与运行验证：`docs/investigations/README.md`
  - 常见故障与摘要台账：`docs/troubleshooting/README.md`、`docs/troubleshooting-log.md`
