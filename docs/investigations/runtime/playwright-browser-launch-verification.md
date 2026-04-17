# Playwright 浏览器启动与页面验收记录

- 日期：2026-04-13
- 作用：本页只做 Playwright 启动主题入口；细节已拆到 `docs/investigations/runtime/playwright-browser-launch/`。
- 当前结论：受限 Codex 会话中，Playwright 可能因为控制链路权限限制而无法启动；在 `danger-full-access` 会话中，浏览器最小启动和完整页面验收链路均已通过。

## 先读哪篇

- 受限会话的现象、失败特征与结论：`docs/investigations/runtime/playwright-browser-launch/restricted-session-findings.md`
- 完全访问会话下的最小启动验证与完整页面验收：`docs/investigations/runtime/playwright-browser-launch/full-access-verification.md`
