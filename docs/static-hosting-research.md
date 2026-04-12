# GitHub Pages 静态部署方案（Vite + React + TypeScript）

- 调研日期：2026-04-12
- 项目背景：Idle Champions 辅助站已确认采用 `Vite + React + TypeScript`。
- 当前结论：**第一阶段使用 `GitHub Pages + GitHub Actions`，并以 `HashRouter` 作为默认路由策略。**

---

## 1. 当前部署决策

### 1.1 技术路线确认

- 前端框架：`React`
- 构建工具：`Vite`
- 语言：`TypeScript`
- 部署平台：`GitHub Pages`
- 自动部署：`GitHub Actions`
- 路由策略：**MVP 默认 `HashRouter`**

### 1.2 为什么当前选 GitHub Pages

- 完全适合静态站
- 与当前 Git 仓库天然一致
- 不需要后端服务器
- 能直接接入 GitHub Actions
- 对第一阶段的工具站已经足够

### 1.3 为什么默认选 HashRouter

当前项目第一阶段更看重：

- 少踩部署坑
- 少处理 SPA 刷新 404
- 少做平台特定回退脚本

因此默认推荐：

- 用 `HashRouter`
- 不把 `404.html` 路由回退当第一阶段前提

后续如果确实需要更干净的 URL，再单独评估 `BrowserRouter + 404 回退`。

---

## 2. GitHub Pages 里最容易踩的两个点

### 2.1 `base` 路径

当前仓库会部署成 **项目站**，URL 形态类似：

```text
https://用户名.github.io/Idle-Champions-Helper/
```

因此生产环境必须处理 `base` 路径。

推荐配置：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'Idle-Champions-Helper'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : `/${repoName}/`,
}))
```

这样做的好处：

- 本地开发继续走 `/`
- GitHub Pages 构建产物自动带仓库前缀

### 2.2 路由策略

如果直接用 `BrowserRouter`：

- 用户刷新子页面时，GitHub Pages 会按静态文件路径查找
- 找不到文件就会返回 404

如果用 `HashRouter`：

- URL 会是 `#/champions`
- GitHub Pages 只需要返回同一个 `index.html`
- 不需要额外的服务端重写能力

当前项目结论：**第一阶段默认 `HashRouter`。**

---

## 3. 推荐初始化步骤

### 3.1 创建项目

```bash
npm create vite@latest . -- --template react-ts
npm install
```

### 3.2 安装路由依赖

```bash
npm install react-router-dom
```

### 3.3 路由入口示例

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './app/App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
```

---

## 4. GitHub Actions 部署工作流

推荐使用 GitHub Pages 官方 Actions 工作流，而不是自己维护 `gh-pages` 分支。

`.github/workflows/deploy.yml` 示例：

```yaml
name: 部署 GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: github-pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 拉取代码
        uses: actions/checkout@v4

      - name: 配置 GitHub Pages
        uses: actions/configure-pages@v5

      - name: 配置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: 安装依赖
        run: npm ci

      - name: 构建站点
        run: npm run build

      - name: 上传构建产物
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: 发布到 GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

配置要点：

- 仓库设置里的 Pages 来源选 **GitHub Actions**
- 构建产物由 `dist/` 上传
- 不再依赖 `gh-pages` 分支托管静态文件

---

## 5. 本项目当前推荐目录

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docs/
├── public/
│   └── data/
│       ├── version.json
│       └── v1/
├── src/
│   ├── app/
│   ├── components/
│   ├── data/
│   ├── domain/
│   ├── pages/
│   ├── rules/
│   └── styles/
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

说明：

- `src/app/`：应用入口、路由和整体壳层
- `src/domain/`：类型定义和领域模型
- `src/data/`：数据加载与缓存逻辑
- `src/rules/`：规则层，例如 seat 冲突、资格判断
- `public/data/`：版本化静态数据

---

## 6. 自定义域名与后续演进

### 6.1 什么时候再考虑自定义域名

等下面几件事至少完成两项再说：

- MVP 页面闭环已经跑通
- 数据结构基本稳定
- 有真实用户在用
- 访问体验问题已经被明确反馈

### 6.2 如果以后接入自定义域名

需要同步复查：

- `vite.config.ts` 的 `base`
- `robots.txt` 和 `sitemap.xml`
- GitHub Pages 设置页
- Cloudflare 或其他 CDN 的缓存配置

### 6.3 如果以后一定要用干净 URL

可以再评估：

- 改为 `BrowserRouter`
- 构建阶段生成 `404.html` 回退页
- 明确记录 GitHub Pages 的 SPA 路由约束

但这不是当前第一阶段的默认方案。

---

## 7. 当前建议总结

| 维度 | 当前选择 |
| --- | --- |
| 技术路线 | `Vite + React + TypeScript` |
| 托管平台 | `GitHub Pages` |
| 发布方式 | `GitHub Actions` 官方 Pages 工作流 |
| 路由策略 | `HashRouter` |
| `base` 策略 | 开发环境 `/`，生产环境 `/${仓库名}/` |
| 是否需要 `gh-pages` 分支 | 不需要 |
| 是否默认依赖 `404.html` 回退 | 不需要 |

> 当前最优先的是把工具站本身做起来，而不是过早为“更漂亮的 URL”或更复杂的托管方案付出额外成本。
