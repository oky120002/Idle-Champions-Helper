# 文档索引重复与环境路径耦合导致文档老化

- 状态 / 时间：已解决；`2026-04-13`
- 影响：`README.md`、索引和部分排查 / 设计文档与仓库现状不一致，历史信息容易被误读成现状。
- 根因：同一文档清单被多处重复维护；部分文档写入会话专用绝对路径；测试设计文档把“已实现”和“待实现”混写。
- 处理：把 `docs/README.md` 收敛为总索引，新增 `docs/product/documentation-governance.md`，回填本地预览与测试门禁现状，并把历史性排查标明状态。
- 验证：`npm run build` 通过；`npm run preview:pages` 能正确返回 `/Idle-Champions-Helper/` 与静态资源；本地 Markdown 链接检查通过。
- 入口：`README.md`、`docs/README.md`、`docs/product/documentation-governance.md`、`docs/investigations/runtime/local-run-verification.md`、`docs/research/testing/regression-testing-research.md`
