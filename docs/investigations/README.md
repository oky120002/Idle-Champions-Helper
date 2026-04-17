# investigations 文档入口

- 作用：收纳排查、验证、环境确认和历史问题记录；只在需要复现或核对结论时进入。

## runtime

- `docs/investigations/runtime/local-run-verification.md`：`dev`、`preview`、`preview:pages` 的差异和当前推荐入口。
- `docs/investigations/runtime/champions-filter-scroll-stability-investigation.md`：英雄筛选长列表滚动跳动、回顶和结果区稳定性修复。
- `docs/investigations/runtime/playwright-browser-launch-verification.md`：Playwright 在受限会话与完全访问会话下的差异验证。

## repository

- `docs/investigations/repository/github-directory-commit-investigation.md`：`.github` 空目录不被 Git 跟踪的原因与修复方式。
- `docs/investigations/repository/agents-layering-verification.md`：仓库内外 `AGENTS.md` 分层核对记录。

## 读取建议

- 先看 `docs/troubleshooting-log.md` 判断有没有现成摘要；只有需要复现、核对证据或看完整边界时，再打开专题排查文档。
- 排查文档必须明确“当前是否仍有效”；已经沉淀成通用摘要的问题，应优先回填到 `docs/troubleshooting-log.md`。
