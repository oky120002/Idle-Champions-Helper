# GitHub Pages 首次部署失败

- 状态 / 时间：已解决；`2026-04-13`
- 影响：`Idle-Champions-Helper` 首次 Pages 发布失败，线上地址一度不可访问。
- 根因：仓库未启用 GitHub Pages；叠加旧 `GITHUB_TOKEN` 失效、新 PAT 一度缺少 `workflow` 权限，以及本机网络 / 代理不稳定。
- 排查：先确认 workflow 已在远端 `main`，再看 run 详情定位 `actions/configure-pages`，随后核对 `has_pages = false`、PAT 权限与网络链路。
- 处理：重建 PAT、补齐 `repo + workflow` 权限、推送 workflow、启用 Pages 并改为 `GitHub Actions` 发布、重跑失败任务。
- 验证：第二次运行中 `build` 与 `deploy` 成功；站点可访问 `https://oky120002.github.io/Idle-Champions-Helper/`。
- 备注：`export GITHUB_TOKEN="ghp_xxx"` 这种 shell 写法通常不是主因；只有真实值里混入字面量引号、空格或换行才会导致认证异常。
- 入口：`.github/workflows/deploy.yml`、`docs/research/deployment/static-hosting-research.md`、`docs/investigations/runtime/local-run-verification.md`
