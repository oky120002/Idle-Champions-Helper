# 问题排查台账

## 维护规则

- 这份文档只记录可复用的问题结论，覆盖流程、环境、认证、网络、部署、运行等非单点代码缺陷问题。
- 新问题解决后，优先直接补到本文件；只有需要长期展开维护时，才拆专题文档。
- 单条记录原则上控制在 5~20 行；问题特别复杂时，也应尽量压缩在 50 行以内。
- 记录采用摘要式写法，优先保留：问题描述、排查摘要、根因、解决方案、验证结果、引用信息。
- 不写流水账，不逐条粘贴命令输出；超长过程放专题文档，这里只保留结论和入口。

---

## 记录 001：GitHub Pages 首次部署失败

- 状态：已解决；时间：`2026-04-13`
- 影响：`Idle-Champions-Helper` 的 GitHub Pages 首次部署失败，线上地址最初不可访问。
- 问题：workflow 已推送且已触发，但任务卡在 `actions/configure-pages`，同时排查期间伴随 token 与网络异常。
- 排查摘要：先确认 workflow 在远端 `main`，再查看 run 详情定位失败步骤，随后查询仓库状态发现 `has_pages = false`，并同步复核 PAT 有效性、权限与网络链路。
- 根因：直接根因是仓库未启用 `GitHub Pages`；叠加因素包括旧 `GITHUB_TOKEN` 失效、新 PAT 一度缺少 `workflow` 权限、本机网络/代理不稳定。
- 引号判断：`export GITHUB_TOKEN="ghp_xxx"` 这类 shell 写法通常没问题；只有真实值里混入字面量引号、空格或换行时才会导致认证异常，这次不是主因。
- 解决：重建可用 PAT，补齐 `repo + workflow` 权限，推送 workflow，开启仓库 Pages 并切到 `GitHub Actions` 发布，最后重跑失败任务。
- 验证：第二次运行中 `build` 与 `deploy` 均成功，站点已可访问：`https://oky120002.github.io/Idle-Champions-Helper/`
- 引用：`.github/workflows/deploy.yml`、`docs/research/deployment/static-hosting-research.md`、`docs/investigations/runtime/local-run-verification.md`
- 记录：成功运行页 `https://github.com/oky120002/Idle-Champions-Helper/actions/runs/24312930707`

## 记录 002：受限 Codex 会话内 Playwright 浏览器无法正常启动

- 状态：已定位；时间：`2026-04-13`
- 影响：在受限 Codex 会话中，浏览器端自动化验收无法完成，尽管 Playwright 浏览器已安装成功。
- 排查摘要：先确认 `PLAYWRIGHT_BROWSERS_PATH` 指向长期目录，再分别测试 `firefox / chromium / webkit` 的 `playwright.launch()`；随后补做“直接启动浏览器二进制”的对照验证。
- 现象：`firefox.launch()` 在 `-juggler-pipe` 模式下启动后直接 `SIGABRT`；`chromium.launch()` 在 `--remote-debugging-pipe` 阶段报 `MachPortRendezvousServer ... Permission denied (1100)`；`webkit` 同样无法在当前环境内完成启动。
- 结论：安装本身不是主因，主要受当时会话的权限/沙箱限制影响；浏览器二进制可直接启动，但 Playwright 控制链路无法稳定建立。
- 后续验证：切换到 `danger-full-access` 会话后，`firefox / chromium / webkit` 均可正常启动，完整页面验收也已跑通。
- 处理：在受限会话内先用 `npm run build` + `npm run lint` 做最小充分验证；需要真实页面回归时，优先切到完全访问权限会话。
- 引用：`docs/investigations/runtime/playwright-browser-launch-verification.md`

## 记录 003：文档索引重复与环境路径耦合导致文档老化

- 状态：已解决；时间：`2026-04-13`
- 影响：README、文档索引和部分排查/设计文档对当前仓库事实表述不一致，容易把历史信息误读为现状。
- 排查摘要：对比了 `README.md`、`docs/README.md`、`package.json`、`.github/workflows/deploy.yml`、本地预览脚本与现有调研/排查文档。
- 根因：同一份文档清单被多处重复维护；部分文档写入了会话专用绝对路径；测试设计文档把“已实现”和“待实现”混在一起。
- 解决：把 `docs/README.md` 收敛为 `docs/` 总索引，新增 `docs/product/documentation-governance.md` 约束扫描流程，回填本地预览和测试门禁现状，并把历史性排查标为归档。
- 验证：`npm run build` 通过；`npm run preview:pages` 能正确返回 `/Idle-Champions-Helper/` 与静态资源；本地 Markdown 链接检查通过。
- 引用：`README.md`、`docs/README.md`、`docs/product/documentation-governance.md`、`docs/investigations/runtime/local-run-verification.md`、`docs/research/testing/regression-testing-research.md`

## 记录 004：旧工作树残留的预览服务会污染当前浏览器回归

- 状态：已解决；时间：`2026-04-13`
- 影响：当前工作树执行 `Playwright` 或手工浏览器验收时，可能实际命中另一个工作树残留的 `preview:pages` 服务，导致页面结构、路由行为和本地源码不一致。
- 排查摘要：先发现 `#/champions/7` 在浏览器里落回首页、筛选卡 DOM 也和当前源码不一致；随后检查 `4173` 端口监听进程，确认占用者来自另一条工作树。
- 根因：`playwright.config.ts` 与本地预览默认都使用 `127.0.0.1:4173`；当旧工作树的预览进程未退出时，当前会话会误复用旧服务，读到过期 `dist/`。
- 解决：先用 `lsof -nP -iTCP:4173 -sTCP:LISTEN` 确认占用进程，再关闭旧服务，随后在当前工作树重新执行 `npm run build` 与 `Playwright` 回归。
- 验证：关闭旧服务后，`tests/e2e/smoke/navigation.spec.ts` 与 `tests/e2e/smoke/champion-detail.spec.ts` 都能在当前工作树产物上通过。
- 引用：`playwright.config.ts`、`scripts/serve-github-pages-preview.mjs`
