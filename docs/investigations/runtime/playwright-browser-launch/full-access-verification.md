# Playwright：完全访问会话下的页面验收

- 日期：2026-04-13
- 目标：记录切到 `danger-full-access` 后的最小启动验证和完整页面验收结论。

## 第二轮验证

在切换到完全访问权限会话后，重新执行了：最小浏览器启动验证 `firefox.launch(headless=True)`、`chromium.launch(headless=True)`、`webkit.launch(headless=True)`；以及完整页面验收脚本：启动本地 Vite 服务，依次覆盖放置英雄并制造 / 消除 `seat` 冲突、等待最近草稿自动保存、刷新后恢复最近草稿、保存为命名方案、在方案页编辑名称 / 备注 / 优先级、从方案恢复回阵型页、删除方案并验证空态。

## 结果与最终结论

- `firefox / chromium / webkit` 最小启动验证：全部通过
- 完整页面验收脚本：通过
- 结果标记：`VERIFICATION_OK`
- 验证截图目录：本地临时输出目录（会随会话变化，不作为仓库契约）

最终确认：在受限 Codex 会话中，Playwright 可能因为运行权限限制而无法启动；在 `danger-full-access` 会话中，Playwright 与完整页面验收链路均已通过；当前这条工作树上的“最近草稿 + 命名方案库”主流程已完成真实浏览器自动化点验。
