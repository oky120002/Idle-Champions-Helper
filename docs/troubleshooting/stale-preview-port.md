# 旧工作树残留预览服务污染当前浏览器回归

- 状态 / 时间：已解决；`2026-04-13`
- 影响：当前工作树跑 Playwright 或手工验收时，可能命中另一条工作树残留的 `preview:pages` 服务，导致页面结构与当前源码不一致。
- 根因：`playwright.config.ts` 和本地预览默认都用 `127.0.0.1:4173`；旧工作树未退出时，会误复用旧 `dist/`。
- 排查：发现 `#/champions/7` 落回首页且 DOM 不符后，检查 `4173` 端口监听，确认占用者来自另一条工作树。
- 处理：先用 `lsof -nP -iTCP:4173 -sTCP:LISTEN` 确认进程，再关闭旧服务，随后在当前工作树重新执行 `npm run build` 与 Playwright 回归。
- 验证：关闭旧服务后，`tests/e2e/smoke/navigation.spec.ts` 与 `tests/e2e/smoke/champion-detail.spec.ts` 均能在当前工作树产物上通过。
- 入口：`playwright.config.ts`、`scripts/serve-github-pages-preview.mjs`
