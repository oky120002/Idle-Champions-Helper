# 静态站数据存储方案（Vite + React + TypeScript）

- 调研日期：2026-04-12
- 背景：Idle Champions 辅助站已确认采用 `Vite + React + TypeScript` 静态站路线，默认部署到 GitHub Pages。
- 核心约束：数据更新频率低、没有后端服务、第一阶段优先保证结构清晰和可维护。
- 当前结论：**公共游戏数据使用版本化 JSON 文件；个人数据使用浏览器本地存储；第一阶段不引入数据库、不引入服务端。**

---

## 1. 结论先行

### 1.1 公共数据

- 存放位置：`public/data/`
- 组织方式：`version.json + 版本目录`
- 加载方式：前端运行时 `fetch`
- 推荐原因：
  - 适合静态托管
  - 与 Git 版本管理天然契合
  - 数据更新与页面代码可以分开演进
  - 对当前项目规模来说足够简单、足够稳

### 1.2 个人数据

- 存储位置：浏览器本地
- 推荐方案：`IndexedDB`
- 适合内容：拥有英雄、装备、保存的阵容、偏好设置、个人目标清单

### 1.3 第一阶段明确不做

- 不上 PostgreSQL
- 不上 Prisma
- 不上 GraphQL
- 不上浏览器端 SQLite WASM
- 不把所有 JSON 在构建时直接打进应用包里

---

## 2. 为什么选择版本化 JSON

### 2.1 这类数据天然适合静态文件

本项目第一阶段的公共数据主要是：

- 英雄基础信息
- 冒险 / 变体限制
- 阵型布局
- 枚举与规则标签

这些数据有几个共同特点：

- 更新频率低
- 读取远多于写入
- 数据量可控
- 可以通过脚本或人工维护稳定产出

因此，`JSON 文件 + 运行时加载` 比数据库更符合当前阶段。

### 2.2 相比构建时直接导入 JSON，运行时加载更合适

构建时直接 `import` JSON 的问题：

- 数据会进入 JavaScript 包
- 只要数据一变就要重新构建整个前端
- 不利于后续做数据版本切换与缓存控制

运行时 `fetch` 的优势：

- 数据与页面构建解耦
- 浏览器能独立缓存数据文件
- 后续要拆分页、分实体或加版本目录更自然

---

## 3. 推荐目录结构

```text
public/
  data/
    version.json
    v1/
      champions.json
      variants.json
      formations.json
      enums.json
```

其中：

- `version.json`：描述当前启用的数据版本
- `v1/`：当前版本的数据目录
- 后续如果结构变化较大，可以新增 `v2/`、`v3/`

推荐的 `version.json` 结构：

```json
{
  "current": "v1",
  "updatedAt": "2026-04-12",
  "notes": [
    "当前为工程骨架阶段，正式游戏数据待补充。"
  ]
}
```

推荐的集合文件结构：

```json
{
  "items": [],
  "updatedAt": "2026-04-12"
}
```

这样做的好处：

- 版本切换明确
- 缓存失效策略简单
- 文档与代码都容易理解

---

## 4. 前端加载约定

### 4.1 不要写死绝对路径 `/data/...`

当前默认部署是 GitHub Pages 的项目站，生产地址会带仓库名路径。

因此，下面这种写法 **不适合作为默认示例**：

```ts
fetch('/data/champions.json')
```

这会在项目站环境下绕过 `base` 路径，导致资源地址错误。

### 4.2 正确做法：始终基于 `import.meta.env.BASE_URL`

推荐示例：

```ts
function buildDataUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return `${base}data/${relativePath}`
}
```

加载版本文件：

```ts
const version = await fetch(buildDataUrl('version.json'), { cache: 'no-store' }).then((res) => res.json())
```

加载具体集合：

```ts
const data = await fetch(buildDataUrl(`${version.current}/champions.json`)).then((res) => res.json())
```

### 4.3 建议保留一层数据访问封装

建议目录：

```text
src/
  domain/
    types.ts
  data/
    client.ts
```

职责建议：

- `src/domain/types.ts`：定义 TypeScript 类型
- `src/data/client.ts`：处理版本读取、路径拼接、内存缓存
- 页面侧按需使用 `useEffect + useState` 处理异步状态，避免把简单加载逻辑过早抽成复杂基础设施

这样可以避免以后把 `fetch` 逻辑散落到页面里。

---

## 5. 数据更新工作流

推荐工作流：

```text
抓取官方 definitions 原始快照
  ↓
归一化并补充手工 overrides
  ↓
更新 public/data/v1/*.json
  ↓
必要时调整 version.json
  ↓
运行数据校验 / 构建检查
  ↓
提交代码并推送
  ↓
GitHub Actions 构建并发布到 GitHub Pages
```

当前仓库里对应的最小骨架：

- `scripts/fetch-idle-champions-definitions.mjs`
- `scripts/normalize-idle-champions-definitions.mjs`
- `scripts/data/manual-overrides.json`
- `docs/game-data-source-investigation.md`

这里有一个需要统一的点：

- 当前项目的部署路线是 **GitHub Pages 官方 Actions 发布**
- **不是** 通过 `gh-pages` 分支手工托管构建产物

所以后续文档和脚本都应围绕 `GitHub Actions -> Pages Artifact -> GitHub Pages` 这一条链路设计。

---

## 6. 个人数据存储

### 6.1 为什么是 IndexedDB

适合原因：

- 数据只和当前用户有关
- 不需要上传服务器
- 可以持久保存
- 结构比 `localStorage` 更灵活

### 6.2 适合放进 IndexedDB 的内容

- 已拥有英雄
- 装备等级
- 已保存阵容
- 个人偏好设置
- 自定义目标或备注

### 6.3 第一阶段的边界

第一阶段只需要把接口和目录留好，不需要一开始就把所有本地存储能力做满。

建议顺序：

1. 先落公共数据加载
2. 再补阵容保存
3. 再补完整个人画像

---

## 7. 缓存策略建议

### 7.1 第一阶段默认策略

- 浏览器 HTTP 缓存
- 应用内会话级内存缓存
- `version.json` 使用 `no-store` 读取最新版本号

这一层就足够支撑 MVP。

### 7.2 暂不把 Service Worker 当作第一阶段前提

Service Worker 能做离线缓存，但当前阶段不是必须项。

原因：

- 会增加调试复杂度
- 容易让缓存问题更难排查
- 在数据结构和页面仍在快速变化时，收益不一定高于成本

建议：**等数据结构和页面稳定后，再评估是否接入 PWA / Service Worker。**

---

## 8. 当前推荐结论

| 维度 | 方案 |
| --- | --- |
| 公共游戏数据 | `public/data/version.json + public/data/v1/*.json` |
| 公共数据加载 | 运行时 `fetch`，路径基于 `import.meta.env.BASE_URL` |
| 类型定义 | `TypeScript` 类型放在 `src/domain/types.ts` |
| 个人用户数据 | `IndexedDB` |
| 部署链路 | `GitHub Actions -> GitHub Pages` |
| 第一阶段不做 | 数据库、GraphQL、SQLite WASM、Service Worker 强依赖 |

> 对当前项目来说，版本化 JSON 不是妥协方案，而是第一阶段最稳、最省成本、最容易维护的方案。
