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
- 核心规则、状态转换和副作用不要直接写死在页面层；新增模块需保持可隔离测试。
- 形成可独立识别的阶段性成功后及时提交；提交信息使用 `type:summary`，保持单提交单目标。
- 远端 GitHub 交互优先 `gh` / `gh api`；凡是改动了远端状态，必须同步本地分支、工作树和相关说明。

## 3. 文档约束

- `AGENTS.md` 只写项目差异化、长期稳定的硬规则；`README.md` 只写项目概览、常用命令和高频入口；不要在两者之间重复维护同一事实。
- 文档里引用仓库文件一律使用项目相对路径。
- 技术路线、部署方式、目录结构、命令、数据结构或核心范围变化时，必须同步相关文档。
- 调研、检索、确认结论沉淀到 `docs/`；流程、环境、认证、分支或发布类问题的摘要补到 `docs/troubleshooting-log.md`。
- 新模块或大范围交互改动先补对应设计稿，文档落位遵循 `docs/README.md`。

## 4. 按需加载

- 不预加载整棵 `docs/`；只按当前任务主题读取最相关的文档。
- 项目定位、阶段目标、范围裁剪：`docs/product/idle-champions-roadmap.md`
- 文档职责、精简原则、扫描触发条件：`docs/product/documentation-governance.md`
- `docs/` 目录结构与落位规则：`docs/README.md`
- 主题局部索引：`docs/product/README.md`、`docs/research/README.md`、`docs/modules/README.md`、`docs/investigations/README.md`
- 移动端布局与横向滚动禁令：`docs/product/mobile-compatibility-guidelines.md`
