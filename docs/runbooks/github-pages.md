# GitHub Pages 部署与排障

部署方案和路由决策见 `docs/decisions/0005-deployment-github-pages.md`；事实源是 `vite.config.ts` 与 `.github/workflows/deploy.yml`。

## 初始化检查

1. 仓库 Pages 设置已启用，发布源选择 GitHub Actions。
2. workflow 已在目标分支，构建、artifact 上传和部署具有显式依赖关系。
3. Vite `base` 与项目站路径一致，路由继续使用 `HashRouter`。
4. 本地先完成 `npm run build`、`npm run privacy:scan-build` 和 `npm run preview:pages`。

## 失败定位

按顺序检查：workflow 是否触发、失败 job 与 step、Pages 是否启用、Actions 权限、认证令牌权限、远端网络链路。不要只凭首个认证或网络症状下结论。

部署成功后同时验证 workflow 状态、Pages 地址、项目站根路径和静态资源；工作流仍在 running 时不能称为成功。

## 维护边界

- 自定义域名或 CDN 只有在产品闭环稳定且有真实访问问题时评估；届时同步复核 Vite base、Pages 设置、缓存、robots 和 sitemap。
- 只有愿意维护 404 回退或采用更强托管能力时才评估 clean URL；当前不替换 `HashRouter`。
