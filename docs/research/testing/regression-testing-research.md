# 主分支整体回归测试框架设计

- 日期：2026-04-13
- 作用：本页只做回归测试主题入口；细节已拆到 `docs/research/testing/regression/`。
- 当前结论：采用“本地快反馈 + PR 快速门禁 + `main` 全量回归 + 通过后部署”的分层框架；部署永远依赖完整回归，不能并行绕过。

## 先读哪篇

- 目标、边界、分层和仓库基线：`docs/research/testing/regression/scope-and-layers.md`
- CI workflow、`main` 门禁和 Playwright CI 策略：`docs/research/testing/regression/ci-and-gates.md`
- 覆盖范围、阶段状态、最终建议与未决点：`docs/research/testing/regression/coverage-and-rollout.md`
