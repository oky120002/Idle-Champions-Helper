# docs 文档目录说明

本目录按“文档用途优先、主题次级归类”的原则组织，不再把所有 Markdown 文档平铺在 `docs/` 根目录。

## 目录分层

- `docs/product/`：产品级文档，收纳路线图、范围边界、PRD、全局方案等面向整个项目的说明。
- `docs/research/`：调研、检索、确认类文档，先按主题分二级目录，例如 `data/`、`deployment/`；后续如有玩法机制、第三方工具、测试方案等调研，可继续按主题扩展。
- `docs/modules/`：模块级文档。每个模块使用独立目录，模块开发前必须先落一份设计稿；同目录下可继续补模块调研、验证和实现说明。
- `docs/investigations/`：排查、故障、环境确认类文档，按排查对象或领域拆分二级目录，避免与正式调研或设计稿混放。

## 命名规则

- 目录名与文件名统一使用 kebab-case。
- 调研类文件统一使用 `主题-research.md`。
- 排查或确认类文件统一使用 `主题-investigation.md` 或 `主题-verification.md`。
- 模块设计稿统一放在 `docs/modules/<module>/` 下，文件名优先使用 `<module>-design.md`。
- 不再直接把新文档放在 `docs/` 根目录；只有 `docs/README.md` 保留在根目录作为总索引。

## 当前索引

- `docs/product/idle-champions-roadmap.md`：项目价值、范围、阶段路线与核心模型。
- `docs/research/data/static-data-storage-research.md`：静态数据存储与版本化策略。
- `docs/research/deployment/static-hosting-research.md`：GitHub Pages 部署方案与路由策略。
- `docs/research/deployment/china-static-hosting-research.md`：国内访问体验与托管备选方案。
- `docs/modules/user-data/user-data-import-design.md`：本地优先的个人数据导入设计稿。
- `docs/investigations/repository/github-directory-commit-investigation.md`：`.github` 目录无法提交的本地原因排查。
- `docs/investigations/runtime/local-run-verification.md`：本地构建与预览可用性验证记录。

## 后续新增文档的放置建议

- 新的产品阶段规划、范围调整、PRD：放 `docs/product/`
- 新的外部资料调研、技术选型、来源核实：放 `docs/research/<topic>/`
- 新模块开发前设计稿及其配套验证：放 `docs/modules/<module>/`
- 临时问题排查、环境确认、异常复盘：放 `docs/investigations/<topic>/`
