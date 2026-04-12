# GitHub Pages 完整使用指南与最佳实践

- 调研日期：2026-04-12
- 目标读者：从未使用过 GitHub Pages 的开发者
- 项目背景：Vite + React 静态站（Idle Champions 游戏辅助网站）

---

## 1. GitHub Pages 是什么

GitHub Pages 是 GitHub 提供的**免费静态网站托管服务**。你把 HTML/CSS/JS 文件放在 GitHub 仓库里，GitHub 自动把它们变成一个可以访问的网站。

**核心特点：**
- 完全免费
- 不需要服务器
- 不需要数据库
- 支持 HTTPS
- 支持自定义域名
- 和 Git 工作流深度集成

---

## 2. 三种站点类型

| 类型 | 仓库名 | URL 格式 | 数量限制 |
|------|--------|---------|---------|
| User（用户站） | `username.github.io` | `https://username.github.io` | 每个 GitHub 账户只能有 1 个 |
| Organization（组织站） | `orgname.github.io` | `https://orgname.github.io` | 每个组织只能有 1 个 |
| Project（项目站） | 任意仓库名 | `https://username.github.io/repo-name` | 不限数量 |

**对你的项目建议：** 如果是独立网站，用 Project 站即可（URL 会带仓库名路径）。如果想用根域名（如 `ic.yourdomain.com`），可以考虑 User/Organization 站。

---

## 3. 使用限制（官方）

来源：GitHub 官方文档

| 限制项 | 值 |
|--------|-----|
| 仓库大小 | 推荐 ≤ 1 GB |
| 发布站点大小 | ≤ 1 GB |
| 单文件大小 | ≤ 100 MB |
| 月带宽 | 软限制 100 GB |
| 构建频率 | 软限制 10 次/小时（使用 Actions 不受此限制） |
| 部署超时 | 10 分钟 |
| 每账户用户/组织站 | 1 个 |
| 项目站数量 | 不限 |

> 对一个游戏辅助站来说，这些限制完全够用。

---

## 4. 部署方式对比

GitHub Pages 支持三种部署方式：

### 4.1 直接从分支部署（传统方式）

- 把静态文件放到 `gh-pages` 分支或 `main` 分支的 `/docs` 目录
- GitHub 自动发布
- **缺点**：会触发 Jekyll 构建（会把下划线开头的文件/目录吃掉），对 SPA 不友好

### 4.2 Jekyll 自动构建

- GitHub 内置 Jekyll 支持
- 适合博客、文档站
- **不适合 SPA 项目**

### 4.3 GitHub Actions 部署（✅ 推荐）

- 用 Actions 工作流构建项目，输出部署到 GitHub Pages
- 完全控制构建过程
- 不触发 Jekyll
- **这是部署 Vite + React SPA 的最佳方式**

**Actions 部署 vs 分支部署的核心区别：**

| 维度 | 分支部署 | Actions 部署 |
|------|---------|-------------|
| 构建控制 | GitHub 自动（Jekyll） | 你完全控制 |
| 10次/小时限制 | 受限 | 不受限 |
| 环境变量 | 不支持 | 支持 |
| 构建缓存 | 无 | 可配置 |
| 适合 SPA | 差 | 完美 |

---

## 5. 从零开始：完整部署步骤

### 5.1 创建仓库

```bash
# 在 GitHub 上创建新仓库，比如叫 idle-champions-site
# 然后 clone 到本地
git clone https://github.com/你的用户名/idle-champions-site.git
cd idle-champions-site
```

### 5.2 初始化 Vite + React 项目

```bash
npm create vite@latest . -- --template react-ts
npm install
```

### 5.3 配置 vite.config.ts

**这是最关键的一步。** GitHub Pages 的 Project 站 URL 带仓库名路径（如 `/idle-champions-site/`），必须配置 `base`：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Project 站必须设置 base 为仓库名
  base: '/idle-champions-site/',
  // 如果是 User 站（username.github.io），base 设为 '/'
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
```

> ⚠️ **base 路径必须和仓库名一致，前后都要有 `/`。** 如果不设置，所有资源引用都会 404。

### 5.4 解决 SPA 路由问题

GitHub Pages 不支持服务端路由重写。当用户直接访问 `/idle-champions-site/champions` 时，GitHub 会尝试找 `champions/index.html`，找不到就返回 404。

**解决方案：创建 `public/404.html`，内容复制 `index.html`**

Vite 构建时 `index.html` 会自动放到 `dist/`，但我们需要一个 `404.html` 做回退：

```html
<!-- public/404.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Idle Champions Helper</title>
  <script>
    // 把当前路径存到 sessionStorage，然后跳到首页
    sessionStorage.redirect = location.href;
  </script>
  <meta http-equiv="refresh" content="0;URL='/idle-champions-site/'">
</head>
</html>
```

然后在 `index.html` 的 `<head>` 里加一段脚本：

```html
<!-- 在 index.html 的 <head> 里加 -->
<script>
  // 从 404 跳转回来后，恢复正确的路由路径
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    history.replaceState(null, null, redirect);
  }
</script>
```

**或者更简单的方案：** 使用 HashRouter 而不是 BrowserRouter：

```typescript
// 使用 HashRouter，URL 会变成 /idle-champions-site/#/champions
// 这样就不存在 404 问题了
import { HashRouter } from 'react-router-dom'

function App() {
  return (
    <HashRouter>
      {/* 路由配置 */}
    </HashRouter>
  )
}
```

> 💡 **推荐新手用 HashRouter**，零配置不踩坑。URL 稍丑（带 `#`），但对游戏辅助工具站完全无所谓。

### 5.5 创建 GitHub Actions 工作流

创建文件 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch: # 允许手动触发

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Add 404.html for SPA routing
        run: cp dist/index.html dist/404.html

      - name: Add .nojekyll
        run: touch dist/.nojekyll

      - name: Upload artifact
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
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**关键点说明：**
- `.nojekyll` 文件：告诉 GitHub 不要用 Jekyll 处理，避免下划线目录被忽略
- `cp dist/index.html dist/404.html`：SPA 路由回退
- `cache: 'npm'`：缓存 node_modules，加速后续构建
- `workflow_dispatch`：允许在 GitHub 网页上手动触发部署

### 5.6 配置 GitHub Pages 源

1. 打开仓库 → Settings → Pages
2. **Source 选择 "GitHub Actions"**（不要选 "Deploy from a branch"）
3. 推送代码到 main 分支，Actions 会自动构建部署

### 5.7 验证部署

```bash
git add .
git commit -m "initial setup"
git push origin main
```

推送后：
1. 到仓库的 **Actions** 标签页查看构建状态
2. 构建成功后，访问 `https://你的用户名.github.io/idle-champions-site/`
3. 首次部署可能需要 1-2 分钟生效

---

## 6. 自定义域名配置（可选）

### 6.1 设置步骤

1. 在仓库 Settings → Pages → Custom domain 填入你的域名
2. 勾选 "Enforce HTTPS"
3. 在域名 DNS 服务商配置 DNS 记录

### 6.2 DNS 记录配置

**如果用 apex 域名（如 `ic.yourdomain.com`）：**

| 记录类型 | 名称 | 值 |
|---------|------|-----|
| CNAME | ic | 你的用户名.github.io |

**如果用根域名（如 `yourdomain.com`）：**

| 记录类型 | 名称 | 值 |
|---------|------|-----|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

> 以上 IP 是 GitHub Pages 官方 A 记录地址（2024年数据），使用前建议到官方文档确认最新值。

### 6.3 HTTPS

- GitHub Pages 使用 Let's Encrypt 自动签发证书
- 域名 DNS 生效后，HTTPS 自动启用
- 勾选 "Enforce HTTPS" 强制跳转
- 证书自动续期，不用管

### 6.4 www 和非 www 重定向

GitHub Pages 自动处理：
- 如果你设置了 `www.example.com` 为自定义域名，`example.com` 会自动 301 重定向到 `www.example.com`
- 反之亦然

### 6.5 注意事项

- DNS 生效可能需要几分钟到几小时
- 配置自定义域名后，仓库根目录会自动创建 `CNAME` 文件（不要删掉）
- 域名总长度必须 < 64 字符才能签发 HTTPS 证书

---

## 7. 性能优化

### 7.1 缓存策略

GitHub Pages 默认 `Cache-Control: max-age=600`（10 分钟）。这对 SPA 来说不太理想。

**优化方案：**

Vite 构建后的文件命名自带 hash（如 `assets/index-DZ4H7q2K.js`），可以利用这一点：

- **HTML 文件**：短缓存或不缓存（每次都拿最新的）
- **JS/CSS/图片等带 hash 的文件**：长期缓存（内容变了文件名就变了）

如果用 Cloudflare CDN，可以配置 "Cache Everything" 规则，对带 hash 的资源设置长 TTL。

### 7.2 Vite 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 代码分割：将 vendor 代码单独打包
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console.log
      },
    },
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500,
  },
})
```

### 7.3 图片优化

- 使用 WebP 格式
- 小图标用 SVG
- 图片放在 `public/` 目录下，通过 CDN 缓存

### 7.4 预加载

在 `index.html` 中添加关键资源预加载：

```html
<link rel="preload" href="/data/champions.json" as="fetch" crossorigin>
```

### 7.5 Service Worker（可选，进阶）

用 `vite-plugin-pwa` 实现离线缓存：

```bash
npm install vite-plugin-pwa -D
```

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // 静态资源长期缓存
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.github\.io\/.*\/assets\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'static-assets', expiration: { maxEntries: 100, maxAgeSeconds: 365 * 24 * 60 * 60 } },
          },
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'game-data' },
          },
        ],
      },
    }),
  ],
})
```

---

## 8. SEO 优化

虽然是 SPA 工具站，但基础 SEO 还是要做。

### 8.1 meta 标签

在每个页面的 `<head>` 中设置（用 `react-helmet-async`）：

```bash
npm install react-helmet-async
```

```typescript
import { Helmet } from 'react-helmet-async'

function ChampionsPage() {
  return (
    <>
      <Helmet>
        <title>英雄查询 - Idle Champions 辅助站</title>
        <meta name="description" content="查询 Idle Champions 所有英雄，按 Seat、Role、Patron 等条件筛选" />
        <meta property="og:title" content="英雄查询 - Idle Champions 辅助站" />
        <meta property="og:description" content="查询 Idle Champions 所有英雄" />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* 页面内容 */}
    </>
  )
}
```

### 8.2 sitemap.xml

使用 `vite-plugin-sitemap` 自动生成：

```bash
npm install vite-plugin-sitemap -D
```

```typescript
// vite.config.ts
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://你的用户名.github.io/idle-champions-site',
      // 如果用 HashRouter，不需要配置路由列表
      // 如果用 BrowserRouter，需要列出所有路由
    }),
  ],
})
```

### 8.3 robots.txt

在 `public/` 目录创建 `robots.txt`：

```
User-agent: *
Allow: /
Sitemap: https://你的用户名.github.io/idle-champions-site/sitemap.xml
```

---

## 9. 常见问题和坑

### 9.1 刷新页面 404

**原因**：GitHub Pages 不支持服务端路由重写，SPA 的客户端路由在刷新时找不到文件。

**解决**：
- 最简单：用 HashRouter
- 或者：配置 404.html 回退（见 5.4 节）

### 9.2 资源路径 404

**原因**：`vite.config.ts` 的 `base` 没配置或配错了。

**检查**：
- Project 站：`base: '/仓库名/'`（前后都有 `/`）
- User 站：`base: '/'`

### 9.3 下划线开头的文件/目录消失

**原因**：Jekyll 默认忽略下划线开头的文件（如 `_redirects`、`assets/icons/_sprite.svg`）。

**解决**：在 `public/` 放一个 `.nojekyll` 空文件。Actions 工作流中已经处理了（`touch dist/.nojekyll`）。

### 9.4 构建成功但页面没更新

**可能原因**：
- 浏览器缓存（硬刷新：Ctrl+Shift+R / Cmd+Shift+R）
- CDN 缓存（等几分钟）
- 检查 Actions 部署步骤是否真的成功

### 9.5 样式和本地不一样

**可能原因**：
- base 路径配置错误，CSS 文件没加载到
- 检查浏览器开发者工具 Network 标签，看是否有 404 资源

---

## 10. 进阶用法

### 10.1 PR 预览部署

使用 `deploy-pr-preview` Action，每个 PR 都能生成一个预览 URL：

```yaml
# .github/workflows/preview.yml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy PR Preview
        uses: rossjrw/pr-preview-action@v1
        with:
          source-dir: dist
```

### 10.2 Cloudflare CDN 配合

**为什么用 Cloudflare：**
- GitHub Pages 默认缓存只有 10 分钟
- 国内访问加速
- 免费套餐完全够用

**配置步骤：**
1. 域名 DNS 托管到 Cloudflare（免费）
2. Cloudflare DNS 中添加 CNAME 记录指向 GitHub Pages
3. Cloudflare 缓存设置 → Configuration → Cache Everything
4. 更新网站后在 Cloudflare 手动 Purge Cache

### 10.3 网站分析

**Plausible（推荐）**：隐私友好，开源可自托管
```html
<script defer data-domain="你的域名" src="https://plausible.io/js/script.js"></script>
```

**Google Analytics**：功能全，但较重

**Cloudflare Web Analytics**：免费，不需要 Cookie 横幅

### 10.4 环境变量

在 Actions 中设置环境变量：

```yaml
- name: Build
  run: npm run build
  env:
    VITE_SITE_URL: https://你的用户名.github.io/idle-champions-site
    VITE_DATA_VERSION: "2026.04.1"
```

代码中通过 `import.meta.env.VITE_SITE_URL` 访问。

---

## 11. 完整项目目录结构参考

```
idle-champions-site/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署配置
├── public/
│   ├── 404.html                # SPA 路由回退（如果用 BrowserRouter）
│   ├── .nojekyll               # 禁用 Jekyll
│   ├── robots.txt              # SEO
│   └── data/                   # 静态 JSON 数据
│       ├── champions.json
│       ├── adventures.json
│       ├── formations.json
│       └── version.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── data/
│   │   └── loader.ts           # 数据加载 + 缓存
│   ├── pages/
│   │   ├── Champions.tsx
│   │   ├── Formations.tsx
│   │   └── Adventures.tsx
│   └── components/
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## 12. 一句话总结

> **创建仓库 → 初始化 Vite → 配置 base 和 HashRouter → 写 Actions 工作流 → push 到 main → 自动部署上线。**

整个过程不需要买服务器，不需要备案，不需要域名。零成本。

---

## 参考来源

1. [GitHub Pages 官方文档 - What is GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
2. [GitHub Pages 官方文档 - Limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
3. [GitHub Pages 官方文档 - Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
4. [GitHub Pages 官方文档 - HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
5. [GitHub Pages 官方文档 - Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll)
6. [GitHub Actions - deploy-pages](https://github.com/actions/deploy-pages)
7. [GitHub Actions - upload-pages-artifact](https://github.com/actions/upload-pages-artifact)
8. [Deploying a Vite React TypeScript app to GitHub Pages using GitHub Actions - Level Up Coding](https://levelup.gitconnected.com/deploying-a-vite-react-typescript-app-to-github-pages-using-github-actions-jest-and-pnpm-as-a-a3461ef9c4ad)
9. [Deploying Vite to GitHub Pages with a Single GitHub Action - Savas Labs](https://www.savalabs.com/blog/deploy-vite-github-pages-action)
10. [Properly set up routing for an SPA hosted on GitHub Pages - GitHub Gist](https://gist.github.com/leonsilicon/1278d429d7c915a9866bc6ea73453d9a)
11. [GitHub Pages does not support routing for SPAs - GitHub Community Discussion #64096](https://github.com/orgs/community/discussions/64096)
12. [Handling 404 Error in SPA Deployed on GitHub Pages - DEV Community](https://dev.to/lico/handling-404-error-in-spa-deployed-on-github-pages-246p)
13. [SGHPA: The Single-Page App Hack For GitHub Pages - Smashing Magazine](https://www.smashingmagazine.com/2016/08/sghpa-single-page-app-hack-github-pages/)
14. [Caching GitHub Pages - mrmarble.dev](https://mrmarble.dev/blog/caching-github-pages/)
15. [Caching Static Assets in GitHub Pages - Stack Overflow](https://stackoverflow.com/questions/77472676/caching-static-assets-in-github-pages)
16. [Optimizing SEO for Your GitHub-Hosted Site](https://free-git-hosting.github.io/seo-for-github-hosted-sites/)
17. [SEO Optimization for React + Vite Apps - DEV Community](https://dev.to/ali_dz/optimizing-seo-in-a-react-vite-project-the-ultimate-guide-3mbh)
18. [vite-plugin-sitemap - npm](https://www.npmjs.com/package/vite-plugin-sitemap)
19. [GitHub Pages vs Cloudflare Pages - Reddit](https://www.reddit.com/r/CloudFlare/comments/1jj6lex/is_there_any_benefit_to_hosting_on_cloudflare/)
20. [Using GitHub Pages as Web Host and Cloudflare as CDN - Rylander Blog](https://blog.rylander.io/2018/08/03/using-github-pages-as-web-host-and-cloudflare-as-cdn/)
21. [GitHub Pages: User/Organization vs Project Sites - Tracktown Software](https://www.tracktownsoftware.com/jekyll/github/2020/12/22/GitHubPagesUserVsProjectSites.html)
22. [A Refresher on GitHub Pages - Frankel Blog](https://blog.frankel.ch/refresher-github-pages/)
23. [Common Mistakes to Avoid When Hosting on GitHub Pages](https://free-git-hosting.github.io/10-common-mistakes-to-avoid-when-hosting-on-github-pages/)
24. [How to Cache Dependencies in GitHub Actions - OneUptime](https://oneuptime.com/blog/post/2025-12-20-github-actions-cache-dependencies/view)
25. [Deploy PR Preview - GitHub Marketplace](https://github.com/marketplace/actions/deploy-pr-preview)
26. [Deploying Vite App to GitHub Pages - DEV Community](https://dev.to/shashannkbawa/deploying-vite-app-to-github-pages-3ane)
