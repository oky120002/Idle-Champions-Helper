# 本地运行：命令结果

- 日期：2026-04-13
- 目标：记录 `build`、`preview`、`preview:pages` 和 `dev` 的实际结果与差异。

## 构建结果

执行 `npm run build` 后：`tsc -b` 通过，`vite build` 通过，成功产出 `dist/`。构建摘要：`dist/index.html 0.63 kB`、`dist/assets/index-CXHGC9pO.css 10.28 kB`、`dist/assets/index-CprSRZTR.js 306.48 kB`。

## `npm run preview` 结果

服务可以启动，但它只适合确认“预览服务拉起了 `dist/`”，不适合作为 GitHub Pages 路径验收入口。

检查结果显示：根路径返回的 HTML 里，脚本和样式都指向 `/Idle-Champions-Helper/assets/...`；但访问 `/Idle-Champions-Helper/assets/index-CprSRZTR.js` 时，返回的仍是 HTML 而不是 JS。

说明：生产 `base` 路径已经写进构建产物，但默认 `vite preview` 没有按 GitHub Pages 项目站的基线路径正确托管这些资源，因此它不能代表“生产路径是否正确”。

## `npm run preview:pages` 结果

检查结果显示：根路径会 `302` 跳到 `/Idle-Champions-Helper/`；基线路径能返回正确的首页 HTML；资源路径会返回真实的 JS 文件内容，而不是 HTML。

说明：`preview:pages` 更贴近 GitHub Pages 项目站的真实访问方式；后续验证构建产物、静态资源路径、`HashRouter` 路由时，应优先使用这个入口。

## 开发服务器结果

执行 `npm run dev` 后：首页返回正常 HTML，`/src/main.tsx` 能返回实际模块内容。

说明：`npm run dev` 仍是日常开发与页面联调的正确入口；它验证的是开发态行为，不等同于 GitHub Pages 构建产物行为。
