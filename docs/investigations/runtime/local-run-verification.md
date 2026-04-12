# 本地运行验证

- 验证时间：2026-04-13
- 验证对象：`/Users/rain/Workspaces/Idle-Champions-Helper`
- 当前结论：**项目当前可以在本地构建，并且可以通过 Vite 开发服务器正常查看页面；直接查看当前生产预览地址会白屏。**

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
dist/index.html                   0.63 kB
dist/assets/index--28uTBvw.css    6.03 kB
dist/assets/index-CbnY9ifo.js   250.94 kB
```

### 1.2 生产预览结果

执行：

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

服务可以启动，但当前访问效果有问题。

服务启动后输出：

```text
Local: http://127.0.0.1:4173/
```

随后检查首页与静态资源返回时发现：

```bash
curl -I http://127.0.0.1:4173/
curl -s http://127.0.0.1:4173/Idle-Champions-Helper/assets/index-CbnY9ifo.js | sed -n '1,10p'
```

返回：

```text
HTTP/1.1 200 OK
<!doctype html>
```

说明：

- 首页 HTML 能返回
- 但 JS / CSS 资源请求返回的也是 HTML，而不是真正的静态资源
- 浏览器因此无法加载前端脚本，打开页面会出现白屏

这个问题和当前 `vite.config.ts` 里的生产 `base` 配置有关：生产构建使用 `/${repoName}/`，而本地直接用当前预览地址查看时，不适合作为“本地效果预览”的主入口。

### 1.3 开发服务器结果

执行：

```bash
npm run dev -- --host 127.0.0.1 --port 4174
```

服务启动后输出：

```text
Local: http://127.0.0.1:4174/
```

随后检查首页与模块资源：

```bash
curl -I http://127.0.0.1:4174/
curl -s http://127.0.0.1:4174/src/main.tsx | sed -n '1,20p'
```

结果显示：

- 首页返回正常 HTML
- `/src/main.tsx` 能返回实际模块内容

说明当前开发服务器可作为本地查看页面效果的正确入口。

---

## 2. 当前页面形态

从代码结构和预览入口可确认，当前站点已经具备以下页面入口：

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

## 3. 注意事项

- 本次验证确认了“能构建”
- 也确认了“能通过开发服务器正常访问”
- 但同时确认“当前生产预览地址会白屏”
- 但没有证明所有业务页面都已完整实现
- 当前仓库仍存在未提交修改，运行结果基于当前工作区状态，不等同于远端 `main`
- 在当前 CLI 沙箱里，直接启动本地监听会受限，因此本次本地服务验证是通过沙箱外启动完成

---

## 4. 本次验证依据

- `package.json`
- `vite.config.ts`
- `src/app/App.tsx`
- `src/pages/HomePage.tsx`
- 本地命令：`npm run build`
- 本地命令：`npm run preview -- --host 127.0.0.1 --port 4173`
- 本地命令：`curl -I http://127.0.0.1:4173/`
- 本地命令：`curl -s http://127.0.0.1:4173/Idle-Champions-Helper/assets/index-CbnY9ifo.js`
- 本地命令：`npm run dev -- --host 127.0.0.1 --port 4174`
- 本地命令：`curl -I http://127.0.0.1:4174/`
- 本地命令：`curl -s http://127.0.0.1:4174/src/main.tsx`
