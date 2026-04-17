# 回归测试：CI 设计与门禁

- 日期：2026-04-13
- 目标：回答“workflow 应怎么拆”“部署门禁怎样保持依赖链”“Playwright CI 应怎样配置”。

## GitHub Actions 设计

- 推荐最终拆成两个 workflow：
  - `ci.yml`：触发 `pull_request -> main` 与 `workflow_dispatch`；跑快速质量门禁、单元 / 数据 / 组件测试、轻量 smoke。
  - `deploy.yml`：触发 `push main` 与 `workflow_dispatch`；跑 `main` 完整回归、构建、上传 artifact、部署。
- 如果暂时不拆，单工作流也要显式保持依赖链：`quality -> tests -> build-pages -> deploy-pages`；`deploy-pages` 只能在 `push main` 且前序全过后运行。
- 部署门禁关键点：显式 `needs` 依赖构建作业；使用 GitHub Pages 环境；不允许与测试作业并行提前执行。

## Playwright CI 策略

- CI 优先稳定：`workers = 1`；本地可保持默认并行。
- 重试：本地 `0`；CI `1`。允许一次重试辅助定位偶发抖动，但 `flaky` 应视为待清零告警，不是健康状态。
- 失败证据：`trace: 'on-first-retry'`、`screenshot: 'only-on-failure'`、`video` 按成本决定。
- 路径口径：浏览器级回归必须覆盖 GitHub Pages 项目站路径；不能只测 `http://127.0.0.1:4173/` 根路径，否则会漏掉 `base` 与 `HashRouter` 问题。
