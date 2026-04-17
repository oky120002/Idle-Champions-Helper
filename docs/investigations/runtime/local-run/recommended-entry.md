# 本地运行：推荐入口与依据

- 日期：2026-04-13
- 目标：沉淀当前页面形态、推荐入口和本次验证依据。

## 当前页面形态

从代码结构和本次预览入口可确认，当前站点已经具备这些页面入口：`总览`、`英雄筛选`、`变体筛选`、`阵型编辑`、`方案存档`、`个人数据`。首页主标题为 `个人成长决策台`。

当前更接近：已可打开的早期产品骨架，已有导航、视觉样式、数据版本读取和多页面壳层；还不是功能完整的可用版本。

## 当前建议入口

- 日常开发与联调：`npm run dev`
- 构建产物与 GitHub Pages 路径校验：`npm run preview:pages`
- 仅确认 `dist/` 是否能被本地服务拉起：`npm run preview`

## 注意事项

- 本次验证确认了“能构建”
- 也确认了“能通过开发服务器正常访问”
- 还确认了“默认 `vite preview` 不能替代 GitHub Pages 路径验收”
- `preview:pages` 已经是当前仓库里验证项目站基线路径的推荐入口
- 这些结论只说明运行与预览链路可用，不代表所有业务页面都已完整实现

## 本次验证依据

- `package.json`
- `scripts/serve-github-pages-preview.mjs`
- `vite.config.ts`
- `src/app/App.tsx`
- `src/pages/HomePage.tsx`
- 本地命令：`npm run build`、`npm run preview -- --host 127.0.0.1 --port 4173`、`npm run preview:pages -- --host 127.0.0.1 --port 4173`、`npm run dev -- --host 127.0.0.1 --port 4174`
- 本地命令：`curl -s http://127.0.0.1:4173/`、`curl -s http://127.0.0.1:4173/Idle-Champions-Helper/assets/index-CprSRZTR.js`、`curl -I http://127.0.0.1:4173/`、`curl -s http://127.0.0.1:4173/Idle-Champions-Helper/`、`curl -s http://127.0.0.1:4174/`、`curl -s http://127.0.0.1:4174/src/main.tsx`
