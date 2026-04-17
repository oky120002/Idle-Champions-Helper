# 静态部署：维护与后续演进

- 日期：2026-04-12
- 目标：沉淀初始化 / 维护要点，以及未来才会考虑的演进方向。

## 初始化与维护要点

- 若需要重建最小骨架，可用 `npm create vite@latest . -- --template react-ts` 初始化，再安装 `react-router-dom`。
- 验收静态托管兼容性时，优先检查三件事：`base` 是否正确、`HashRouter` 是否仍在用、静态资源是否都走 `BASE_URL`。
- 构建和部署细节已在仓库文件落地后，不再在文档里重复保留长示例代码块。

## 后续演进

- 自定义域名只在以下条件至少满足两项后再考虑：MVP 闭环稳定、数据结构基本稳定、有真实用户、访问体验问题被明确反馈。
- 如果以后接入自定义域名或 CDN，要同步复查 `vite.config.ts`、GitHub Pages 设置、缓存配置、`robots.txt` / `sitemap.xml`。
- 只有在明确愿意维护 `404` 回退或更强托管能力时，才评估 `BrowserRouter + clean URLs`；它不是当前默认路线。

## 当前建议

- 继续维持 `GitHub Pages + HashRouter`
- 把 `vite.config.ts` 与 `.github/workflows/deploy.yml` 当成部署真相来源
- 文档只保留约束、入口和边界，不再复制通用初始化脚本或整份工作流
