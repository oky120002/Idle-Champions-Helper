# GitHub Pages 静态部署方案

- 日期：2026-04-12
- 作用：本页只做静态部署主题入口；细节已拆到 `docs/research/deployment/static-hosting/`。
- 当前结论：默认采用 `GitHub Pages + GitHub Actions + HashRouter`；所有运行时路径都必须兼容项目站 `base` 前缀。

## 先读哪篇

- 当前决策、约束、发布链路与仓库落点：`docs/research/deployment/static-hosting/constraints-and-flow.md`
- 初始化 / 维护要点、后续演进与当前建议：`docs/research/deployment/static-hosting/maintenance-and-evolution.md`
