# 问题排查台账

- 只记录可复用结论，覆盖流程、环境、认证、网络、部署、运行等非单点代码问题。
- 单条记录优先保留：影响、根因、处理、验证、入口；长过程放专题文档，这里只保留摘要。
- 新问题解决后优先回填本文件；只有需要长期展开维护时再拆专题文档。

## GitHub Pages 首次部署失败

- 状态 / 时间：已解决；`2026-04-13`
- 影响：`Idle-Champions-Helper` 首次 Pages 发布失败，线上地址一度不可访问。
- 根因：仓库未启用 GitHub Pages；叠加旧 `GITHUB_TOKEN` 失效、新 PAT 一度缺少 `workflow` 权限，以及本机网络 / 代理不稳定。
- 排查：先确认 workflow 已在远端 `main`，再看 run 详情定位 `actions/configure-pages`，随后核对 `has_pages = false`、PAT 权限与网络链路。
- 处理：重建 PAT、补齐 `repo + workflow` 权限、推送 workflow、启用 Pages 并改为 `GitHub Actions` 发布、重跑失败任务。
- 验证：第二次运行中 `build` 与 `deploy` 成功；站点可访问 `https://oky120002.github.io/Idle-Champions-Helper/`。
- 备注：`export GITHUB_TOKEN="ghp_xxx"` 这种 shell 写法通常不是主因；只有真实值里混入字面量引号、空格或换行才会导致认证异常。
- 入口：`.github/workflows/deploy.yml`、`docs/research/deployment/static-hosting-research.md`、`docs/investigations/runtime/local-run-verification.md`

## 受限 Codex 会话内 Playwright 无法正常启动

- 状态 / 时间：已定位；`2026-04-13`
- 影响：受限会话内无法完成浏览器级自动化验收，尽管 Playwright 浏览器已安装。
- 现象：`firefox.launch()` 在 `-juggler-pipe` 后 `SIGABRT`；`chromium.launch()` 报 `MachPortRendezvousServer ... Permission denied (1100)`；`webkit` 同样失败。
- 根因：浏览器二进制本身可启动，但 Playwright 控制链路受会话权限 / 沙箱限制影响，安装不是主因。
- 处理：受限会话先跑 `npm run build` + `npm run lint`；需要真实页面回归时切到 `danger-full-access` 会话。
- 验证：切到完全访问权限后，`firefox / chromium / webkit` 均可启动，页面验收通过。
- 入口：`docs/investigations/runtime/playwright-browser-launch-verification.md`

## 文档索引重复与环境路径耦合导致文档老化

- 状态 / 时间：已解决；`2026-04-13`
- 影响：`README.md`、索引和部分排查 / 设计文档与仓库现状不一致，历史信息容易被误读成现状。
- 根因：同一文档清单被多处重复维护；部分文档写入会话专用绝对路径；测试设计文档把“已实现”和“待实现”混写。
- 处理：把 `docs/README.md` 收敛为总索引，新增 `docs/product/documentation-governance.md`，回填本地预览与测试门禁现状，并把历史性排查标明状态。
- 验证：`npm run build` 通过；`npm run preview:pages` 能正确返回 `/Idle-Champions-Helper/` 与静态资源；本地 Markdown 链接检查通过。
- 入口：`README.md`、`docs/README.md`、`docs/product/documentation-governance.md`、`docs/investigations/runtime/local-run-verification.md`、`docs/research/testing/regression-testing-research.md`

## 当前环境直连 GitHub 的 `git push / fetch / ls-remote` 可能卡在 `github.com:443`

- 状态 / 时间：已定位并形成规避方案；`2026-04-13`
- 影响：`git push origin main`、`git fetch origin`、`git ls-remote origin` 在当前环境可能长时间无响应。
- 现象：`git` HTTPS 请求常停在 `Trying 20.205.243.166:443...`；SSH 直连也可能被远端重置；但 `gh auth status` 与 `gh api` 正常。
- 判断：更像当前会话 / 网络环境下 Git 传输链路不稳定，而不是仓库地址、账号权限或 `GITHUB_TOKEN` 失效。
- 处理：远端交互优先 `gh` / `gh api`；若通过 `gh api` 改了远端 ref，后续先 `git fetch origin` 再对齐本地分支与 `origin/*`。
- 入口：`AGENTS.md`

## 旧工作树残留的预览服务会污染当前浏览器回归

- 状态 / 时间：已解决；`2026-04-13`
- 影响：当前工作树跑 Playwright 或手工验收时，可能命中另一条工作树残留的 `preview:pages` 服务，导致页面结构与当前源码不一致。
- 根因：`playwright.config.ts` 和本地预览默认都用 `127.0.0.1:4173`；旧工作树未退出时，会误复用旧 `dist/`。
- 排查：发现 `#/champions/7` 落回首页且 DOM 不符后，检查 `4173` 端口监听，确认占用者来自另一条工作树。
- 处理：先用 `lsof -nP -iTCP:4173 -sTCP:LISTEN` 确认进程，再关闭旧服务，随后在当前工作树重新执行 `npm run build` 与 Playwright 回归。
- 验证：关闭旧服务后，`tests/e2e/smoke/navigation.spec.ts` 与 `tests/e2e/smoke/champion-detail.spec.ts` 均能在当前工作树产物上通过。
- 入口：`playwright.config.ts`、`scripts/serve-github-pages-preview.mjs`
