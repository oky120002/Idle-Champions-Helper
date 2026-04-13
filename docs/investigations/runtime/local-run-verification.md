# 本地运行与预览验证

- 验证时间：2026-04-13
- 验证对象：当前仓库工作树
- 当前结论：**项目当前可以本地构建；日常开发应使用 `npm run dev`；GitHub Pages 路径校验应使用 `npm run preview:pages`；直接访问 `npm run preview` 的根路径仍会因为生产 `base` 为 `/Idle-Champions-Helper/` 而拿到错位资源。**

---

## 1. 验证结果

### 1.1 构建结果

执行：

```bash
npm run build
```

结果：

- `tsc -b` 通过
- `vite build` 通过
- 成功产出 `dist/`

构建摘要：

```text
dist/index.html                   0.63 kB │ gzip:  0.45 kB
dist/assets/index-CXHGC9pO.css   10.28 kB │ gzip:  2.79 kB
dist/assets/index-CprSRZTR.js   306.48 kB │ gzip: 93.66 kB
```

### 1.2 `npm run preview` 结果

执行：

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

服务可以启动，但它只适合确认“预览服务拉起了 `dist/`”，不适合作为 GitHub Pages 路径验收入口。

检查：

```bash
curl -s http://127.0.0.1:4173/ | sed -n '1,20p'
curl -s http://127.0.0.1:4173/Idle-Champions-Helper/assets/index-CprSRZTR.js | sed -n '1,5p'
```

结果显示：

- 根路径返回的 HTML 里，脚本和样式都指向 `/Idle-Champions-Helper/assets/...`
- 但访问 `/Idle-Champions-Helper/assets/index-CprSRZTR.js` 时，返回的仍是 HTML 而不是 JS

说明：

- 生产 `base` 路径已经写进构建产物
- 默认 `vite preview` 没有按 GitHub Pages 项目站的基线路径正确托管这些资源
- 因此它不能代表“生产路径是否正确”

### 1.3 `npm run preview:pages` 结果

执行：

```bash
npm run preview:pages -- --host 127.0.0.1 --port 4173
```

检查：

```bash
curl -I http://127.0.0.1:4173/
curl -s http://127.0.0.1:4173/Idle-Champions-Helper/ | sed -n '1,20p'
curl -s http://127.0.0.1:4173/Idle-Champions-Helper/assets/index-CprSRZTR.js | sed -n '1,5p'
```

结果显示：

- 根路径会 `302` 跳到 `/Idle-Champions-Helper/`
- 基线路径能返回正确的首页 HTML
- 资源路径会返回真实的 JS 文件内容，而不是 HTML

说明：

- `preview:pages` 更贴近 GitHub Pages 项目站的真实访问方式
- 后续验证构建产物、静态资源路径、`HashRouter` 路由时，应优先使用这个入口

### 1.4 开发服务器结果

执行：

```bash
npm run dev -- --host 127.0.0.1 --port 4174
```

检查：

```bash
curl -s http://127.0.0.1:4174/ | sed -n '1,20p'
curl -s http://127.0.0.1:4174/src/main.tsx | sed -n '1,10p'
```

结果显示：

- 首页返回正常 HTML
- `/src/main.tsx` 能返回实际模块内容

说明：

- `npm run dev` 仍是日常开发与页面联调的正确入口
- 它验证的是开发态行为，不等同于 GitHub Pages 构建产物行为

---

## 2. 当前页面形态

从代码结构和本次预览入口可确认，当前站点已经具备以下页面入口：

- `总览`
- `英雄筛选`
- `变体限制`
- `阵型编辑`
- `方案存档`
- `个人数据`

首页主标题为：

- `个人成长决策台`

当前更接近：

- 已可打开的早期产品骨架
- 已有导航、视觉样式、数据版本读取和多页面壳层
- 还不是功能完整的可用版本

---

## 3. 当前建议入口

- 日常开发与联调：`npm run dev`
- 构建产物与 GitHub Pages 路径校验：`npm run preview:pages`
- 仅确认 `dist/` 是否能被本地服务拉起：`npm run preview`

---

## 4. 注意事项

- 本次验证确认了“能构建”
- 也确认了“能通过开发服务器正常访问”
- 还确认了“默认 `vite preview` 不能替代 GitHub Pages 路径验收”
- `preview:pages` 已经是当前仓库里验证项目站基线路径的推荐入口
- 这些结论只说明运行与预览链路可用，不代表所有业务页面都已完整实现

---

## 5. 本次验证依据

- `package.json`
- `scripts/serve-github-pages-preview.mjs`
- `vite.config.ts`
- `src/app/App.tsx`
- `src/pages/HomePage.tsx`
- 本地命令：`npm run build`
- 本地命令：`npm run preview -- --host 127.0.0.1 --port 4173`
- 本地命令：`curl -s http://127.0.0.1:4173/`
- 本地命令：`curl -s http://127.0.0.1:4173/Idle-Champions-Helper/assets/index-CprSRZTR.js`
- 本地命令：`npm run preview:pages -- --host 127.0.0.1 --port 4173`
- 本地命令：`curl -I http://127.0.0.1:4173/`
- 本地命令：`curl -s http://127.0.0.1:4173/Idle-Champions-Helper/`
- 本地命令：`curl -s http://127.0.0.1:4173/Idle-Champions-Helper/assets/index-CprSRZTR.js`
- 本地命令：`npm run dev -- --host 127.0.0.1 --port 4174`
- 本地命令：`curl -s http://127.0.0.1:4174/`
- 本地命令：`curl -s http://127.0.0.1:4174/src/main.tsx`
