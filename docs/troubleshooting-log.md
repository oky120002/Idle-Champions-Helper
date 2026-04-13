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

## 记录 002：Codex CLI 内 Playwright 浏览器无法正常启动

- 状态：已确认环境限制；时间：`2026-04-13`
- 影响：当前仓库的浏览器端自动化验收无法在 Codex CLI 自带沙箱内完成，尽管 Playwright 浏览器已安装成功。
- 排查摘要：先确认 `PLAYWRIGHT_BROWSERS_PATH` 指向长期目录，再分别测试 `firefox / chromium / webkit` 的 `playwright.launch()`；随后补做“直接启动浏览器二进制”的对照验证。
- 现象：`firefox.launch()` 在 `-juggler-pipe` 模式下启动后直接 `SIGABRT`；`chromium.launch()` 在 `--remote-debugging-pipe` 阶段报 `MachPortRendezvousServer ... Permission denied (1100)`；`webkit` 同样无法在当前环境内完成启动。
- 结论：安装本身不是主因，主要受当前 Codex CLI 运行环境的权限/沙箱限制影响；浏览器二进制可直接启动，但 Playwright 控制链路无法在此环境中稳定建立。
- 处理：本轮先以 `npm run build` + `npm run lint` 完成最小充分验证；如需真实页面自动化验收，应改在用户本机常规终端环境运行。
- 引用：`docs/investigations/runtime/playwright-browser-launch-verification.md`
