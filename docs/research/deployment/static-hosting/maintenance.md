# 静态部署：维护要点与未来方向边界

- 作用：沉淀初始化 / 维护要点，以及自定义域名 / 路由切换的触发边界。
- 部署主方案决策见 `decisions/0005-deployment-github-pages.md`；本文件只保留维护事实与边界。

## 初始化与维护要点

- 若需要重建最小骨架，可用 `npm create vite@latest . -- --template react-ts` 初始化，再安装 `react-router-dom`。
- 验收静态托管兼容性时，优先检查三件事：`base` 是否正确、`HashRouter` 是否仍在用、静态资源是否都走 `BASE_URL`。
- 构建和部署细节已在仓库文件实现后，不再在文档里重复保留长示例代码块；`vite.config.ts` 与 `.github/workflows/deploy.yml` 是部署真相来源。

## 未来方向边界

- 自定义域名只在以下条件至少满足两项后再考虑：MVP 闭环稳定、数据结构基本稳定、有真实用户、访问体验问题被明确反馈。
- 如果以后接入自定义域名或 CDN，要同步复查 `vite.config.ts`、GitHub Pages 设置、缓存配置、`robots.txt` / `sitemap.xml`。
- 只有在明确愿意维护 `404` 回退或更强托管能力时，才评估 `BrowserRouter + clean URLs`；它不是当前默认路线。
