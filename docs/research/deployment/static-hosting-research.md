# GitHub Pages 静态部署方案

- 日期：2026-04-12
- 背景：项目已确定使用 `Vite + React + TypeScript`，第一阶段坚持静态站、零额外服务、GitHub Pages 兼容。
- 当前结论：默认采用 `GitHub Pages + GitHub Actions + HashRouter`；所有运行时路径都必须兼容项目站 `base` 前缀。

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

## 发布链路

- 发布工作流的单一事实源是 `.github/workflows/deploy.yml`。
- 预期链路：拉取代码 -> 配置 Pages -> 安装依赖 -> 构建 -> 上传 Pages artifact -> 部署。
- 仓库 Pages 来源必须设为 `GitHub Actions`，而不是手工维护 `gh-pages` 分支。
- 文档只记录约束和入口，不再复制整份 YAML；如需看细节，以 `.github/workflows/deploy.yml` 为准。

## 仓库内相关落点

- `vite.config.ts`：`base`、构建前缀和 Vite 配置。
- `src/main.tsx`、`src/app/App.tsx`：路由入口与应用壳层。
- `public/data/`：版本化静态数据目录。
- `src/data/client.ts`：数据路径拼接与加载封装。
- `.github/workflows/deploy.yml`：正式发布流程。

## 初始化与维护要点

- 若需要重建最小骨架，可用 `npm create vite@latest . -- --template react-ts` 初始化，再安装 `react-router-dom`。
- 验收静态托管兼容性时，优先检查三件事：`base` 是否正确、`HashRouter` 是否仍在用、静态资源是否都走 `BASE_URL`。
- 构建和部署细节已在仓库文件落地后，不再在文档里重复保留长示例代码块。

## 后续演进

- 自定义域名只在以下条件至少满足两项后再考虑：MVP 闭环稳定、数据结构基本稳定、有真实用户、访问体验问题被明确反馈。
- 如果以后接入自定义域名或 CDN，要同步复查 `vite.config.ts`、GitHub Pages 设置、缓存配置、`robots.txt` / `sitemap.xml`。
- 只有在明确愿意维护 `404` 回退或更强托管能力时，才评估 `BrowserRouter + clean URLs`；它不是当前默认路线。

## 当前建议

- 继续维持 `GitHub Pages + HashRouter`。
- 把 `vite.config.ts` 与 `.github/workflows/deploy.yml` 当成部署真相来源。
- 文档只保留约束、入口和边界，不再复制通用初始化脚本或整份工作流。
