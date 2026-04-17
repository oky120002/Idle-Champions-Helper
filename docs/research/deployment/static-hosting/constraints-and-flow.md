# 静态部署：约束与发布链路

- 日期：2026-04-12
- 目标：沉淀当前部署真相来源、必守约束和正式发布链路。

## 当前决策

- 前端：`React`
- 构建：`Vite`
- 语言：`TypeScript`
- 托管：`GitHub Pages`
- 发布：`GitHub Actions`
- 路由：MVP 默认 `HashRouter`

选择 `GitHub Pages` 的原因：静态站足够、与仓库天然一致、无后端成本、可直接接 GitHub Actions。默认选 `HashRouter` 的原因：第一阶段更重视少踩坑、少处理刷新 404、少写平台特定回退脚本。

## 必守约束

- 生产地址是项目站，URL 形态类似 `https://<user>.github.io/Idle-Champions-Helper/`；构建产物必须带仓库名前缀。
- `vite.config.ts` 是 `base` 路径单一事实源：本地 `serve` 走 `/`，构建阶段走 `/${repoName}/`。
- 路由入口以 `src/main.tsx` 和 `src/app/App.tsx` 为准；第一阶段保持 `HashRouter`，不要默认切到 `BrowserRouter`。
- 运行时资源路径必须基于 `import.meta.env.BASE_URL`；不要写死 `/data/...`、`/assets/...` 或假定站点挂在根域名。
- 本地贴近生产的验收入口优先 `npm run preview:pages` 与 `scripts/serve-github-pages-preview.mjs`，不要只看普通 `vite preview`。

## 发布链路与相关落点

- 发布工作流的单一事实源是 `.github/workflows/deploy.yml`。
- 预期链路：拉取代码 -> 配置 Pages -> 安装依赖 -> 构建 -> 上传 Pages artifact -> 部署。
- 仓库 Pages 来源必须设为 `GitHub Actions`，而不是手工维护 `gh-pages` 分支。
- 仓库内相关落点：`vite.config.ts`、`src/main.tsx`、`src/app/App.tsx`、`public/data/`、`src/data/client.ts`、`.github/workflows/deploy.yml`。
