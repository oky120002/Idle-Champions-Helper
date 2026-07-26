# 当前环境直连 GitHub 可能卡在 `github.com:443`

- 状态 / 时间：已定位并形成规避方案；`2026-04-13`
- 影响：`git push origin main`、`git fetch origin`、`git ls-remote origin` 在当前环境可能长时间无响应。
- 现象：`git` HTTPS 请求常停在 `Trying 20.205.243.166:443...`；SSH 直连也可能被远端重置；但 `gh auth status` 与 `gh api` 正常。
- 判断：更像当前会话 / 网络环境下 Git 传输链路不稳定，而不是仓库地址、账号权限或 `GITHUB_TOKEN` 失效。
- 处理：远端交互优先 `gh` / `gh api`；若通过 `gh api` 改了远端 ref，后续先 `git fetch origin` 再对齐本地分支与 `origin/*`。
- 入口：`AGENTS.md`
