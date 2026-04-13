# docs 文档目录说明

本目录按“文档用途优先、主题次级归类”的原则组织，不再把所有 Markdown 文档平铺在 `docs/` 根目录。

`docs/README.md` 是 `docs/` 的唯一总索引；`README.md` 只保留高频入口，不再重复维护完整清单。

## 文档治理入口

- `docs/product/documentation-governance.md`：文档扫描、修复、合并、删除与归档的常规流程。
- `docs/troubleshooting-log.md`：流程、环境、部署、认证等非代码问题的摘要台账。

## 高频入口

如果你当前最关心的是“怎么启动”和“怎么部署”，先看这几份：

- `README.md`：仓库首页，最先看；只保留现状摘要、常用命令与高频入口。
- `docs/troubleshooting-log.md`：统一的问题排查台账，优先收录已发生问题的摘要、根因、解法和引用信息。
- `docs/investigations/runtime/local-run-verification.md`：本地开发、`preview` 与 `preview:pages` 的适用边界与验证结果。
- `docs/research/deployment/static-hosting-research.md`：正式部署路线、GitHub Pages 与 GitHub Actions 工作流设计。
- `docs/research/deployment/china-static-hosting-research.md`：国内访问体验和后续托管备选背景。

## 目录分层

- `docs/product/`：产品级文档，收纳路线图、范围边界、PRD、全局方案等面向整个项目的说明。
- `docs/research/`：调研、检索、确认类文档，先按主题分二级目录，例如 `data/`、`deployment/`；后续如有玩法机制、第三方工具、测试方案等调研，可继续按主题扩展。
- `docs/modules/`：模块级文档。每个模块使用独立目录，模块开发前必须先落一份设计稿；同目录下可继续补模块调研、验证和实现说明。
- `docs/investigations/`：排查、故障、环境确认类文档，按排查对象或领域拆分二级目录，避免与正式调研或设计稿混放。
- `docs/` 根目录：只保留跨主题入口文档，例如 `docs/README.md` 和 `docs/troubleshooting-log.md`。

## 放置判定规则

- 回答“项目要做什么、阶段怎么推进、范围怎么裁剪”的文档，放 `docs/product/`。
- 回答“外部信息是什么、数据或技术应当怎么选”的文档，放 `docs/research/`。
- 回答“某个模块准备怎么做、开发前设计是什么”的文档，放 `docs/modules/<module>/`。
- 回答“某个问题为什么发生、如何复现、如何确认”的文档，放 `docs/investigations/`。

## 预留主题

- `docs/research/data/`：数据来源、字段映射、存储策略、接口链路。
- `docs/research/deployment/`：静态托管、访问策略、发布流程、部署约束。
- `docs/research/testing/`：测试框架选型、自动化策略、测试环境调研。
- `docs/research/tooling/`：构建工具、脚本链路、开发辅助工具调研。
- `docs/investigations/runtime/`：本地运行、构建、预览、浏览器行为排查。
- `docs/investigations/repository/`：Git、目录结构、提交、仓库配置排查。
- `docs/modules/<module>/`：模块设计稿、模块调研、模块验证记录。

## 命名规则

- 目录名与文件名统一使用 kebab-case。
- 调研类文件统一使用 `主题-research.md`。
- 排查或确认类文件统一使用 `主题-investigation.md` 或 `主题-verification.md`。
- 模块设计稿统一放在 `docs/modules/<module>/` 下，文件名优先使用 `<module>-design.md`。
- 文档里引用仓库内文件时统一使用项目相对路径，不写绑定某个工作树或本机用户名的绝对路径。
- 历史性排查文档要在标题、开头说明或索引描述里标明“当前是否仍有效”，避免把旧结论误读为现状。
- 普通新文档不直接放在 `docs/` 根目录；根目录只保留跨主题入口文档，例如 `docs/README.md` 与 `docs/troubleshooting-log.md`。

## 当前索引

- `docs/troubleshooting-log.md`：通用问题排查台账，沉淀问题描述、排查摘要、根因、解法与引用信息。
- `docs/product/documentation-governance.md`：文档治理方案，定义扫描触发条件、修复策略与单一事实源。
- `docs/product/idle-champions-roadmap.md`：项目价值、范围、阶段路线与核心模型。
- `docs/research/data/game-data-source-investigation.md`：基础游戏数据与个人数据来源调研。
- `docs/research/data/champion-portrait-asset-research.md`：官方英雄头像字段、mobile assets 链路与尺寸核实。
- `docs/research/data/champion-visual-asset-research.md`：英雄本体立绘、皮肤立绘与皮肤头像的官方字段链路与远端解析策略。
- `docs/research/data/language-id-7-chinese-definitions-research.md`：`language_id=7` 官方中文 definitions 链路与字段覆盖核实。
- `docs/research/data/static-data-storage-research.md`：静态数据存储与版本化策略。
- `docs/research/testing/regression-testing-research.md`：主分支整体回归测试框架设计。
- `docs/research/deployment/china-static-hosting-research.md`：国内访问体验与托管备选方案。
- `docs/research/deployment/static-hosting-research.md`：GitHub Pages 部署方案与路由策略。
- `docs/modules/champions/champions-filter-design.md`：英雄筛选模块设计稿。
- `docs/modules/formation/formation-editor-design.md`：阵型编辑模块设计稿。
- `docs/modules/presets/presets-design.md`：方案存档模块设计稿。
- `docs/modules/shared-components/shared-components-design.md`：共享组件治理规则、抽取准入条件与测试规范。
- `docs/modules/shared-components/shared-components-catalog.md`：当前可复用组件与相关 helper 索引。
- `docs/modules/user-data/user-data-import-design.md`：本地优先的个人数据导入设计稿。
- `docs/investigations/repository/github-directory-commit-investigation.md`：`.github` 空目录不被 Git 跟踪的历史排查归档。
- `docs/investigations/runtime/local-run-verification.md`：本地构建、开发预览、Vite `preview` 与 GitHub Pages 预览差异验证。
- `docs/investigations/runtime/playwright-browser-launch-verification.md`：当前 Codex CLI 环境下 Playwright 浏览器启动受限的确认记录。

## 后续新增文档的放置建议

- 新的产品阶段规划、范围调整、PRD：放 `docs/product/`
- 新的外部资料调研、技术选型、来源核实：放 `docs/research/<topic>/`
- 新模块开发前设计稿及其配套验证：放 `docs/modules/<module>/`
- 需要长期累计复用的问题排查记录：优先补到 `docs/troubleshooting-log.md`
- 临时问题排查、环境确认、异常复盘：放 `docs/investigations/<topic>/`
