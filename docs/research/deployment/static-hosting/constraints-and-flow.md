# 静态部署：约束与发布链路

- 作用：沉淀 GitHub Pages 部署的必守约束与正式发布链路。
- 部署主方案与路由策略决策见 `decisions/0005-deployment-github-pages.md`；本文件只保留约束与链路事实。

## 必守约束

- 生产地址是项目站，URL 形态类似 `https://<user>.github.io/Idle-Champions-Helper/`；构建产物必须带仓库名前缀。
- `vite.config.ts` 是 `base` 路径单一事实源：本地 `serve` 走 `/`，构建阶段走 `/${repoName}/`。
- 路由入口以 `src/main.tsx` 和 `src/app/App.tsx` 为准；保持 `HashRouter`，不要默认切到 `BrowserRouter`。
- 运行时资源路径必须基于 `import.meta.env.BASE_URL`；不要写死 `/data/...`、`/assets/...` 或假定站点挂在根域名。
- 本地贴近生产的验收入口优先 `npm run preview:pages` 与 `scripts/serve-github-pages-preview.ts`，不要只看普通 `vite preview`。

## 发布链路与相关落点

- 发布工作流的单一事实源是 `.github/workflows/deploy.yml`。
- 预期链路：拉取代码 -> 配置 Pages -> 安装依赖 -> 构建 -> 上传 Pages artifact -> 部署。
- 仓库 Pages 来源必须设为 `GitHub Actions`，而不是手工维护 `gh-pages` 分支。
- 仓库内相关落点：`vite.config.ts`、`src/main.tsx`、`src/app/App.tsx`、`public/data/`、`src/data/client.ts`、`.github/workflows/deploy.yml`。
