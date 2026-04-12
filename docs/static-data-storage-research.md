# 静态网站数据存储方案调研

- 调研日期：2026-04-12
- 背景：Idle Champions 辅助网站（Vite + React + GitHub Pages）的数据层选型
- 核心约束：数据更新频率低（每 2-3 周）、不需要服务端动态处理、部署在静态托管平台

---

## 1. 方案对比

### 1.1 JSON 文件（推荐 ✅）

**最适合本项目的方案。**

- 零依赖，不需要数据库引擎
- 和 Git 工作流天然契合（数据变更 = PR → review → merge）
- 前端直接 `fetch('/data/champions.json')` 加载
- 游戏英雄数量约 130-150 个，完整 JSON 数据预计 200-500 KB，完全可控

**组织方式建议：按实体拆分**

```
public/data/
  champions.json        # 所有英雄数据（~200KB）
  adventures.json       # 冒险/变体数据
  formations.json       # 阵型布局数据
  patron-restrictions.json  # Patron 限制规则
  tags.json             # 标签/种族/阵营等枚举
  version.json          # 数据版本号 + 更新日期
```

**前端加载方式：**

- 构建时打包：Vite 的 `import` 直接导入 JSON → 打包进 JS bundle → 首屏更快，但每次更新需要重新构建
- 运行时 fetch：`fetch('/data/champions.json')` → 独立缓存控制 → 更新数据不需要重新构建前端

**推荐：运行时 fetch**。理由：
- 数据更新和前端部署解耦
- 可以通过 `version.json` 检测数据版本，触发缓存刷新
- 用户浏览器天然缓存 JSON 文件，二次访问极快

### 1.2 SQLite WASM

- 在浏览器端运行完整 SQL 查询
- 适合复杂关联查询场景
- **不推荐本项目**：英雄数据量太小，杀鸡用牛刀；增加 ~1MB WASM 依赖；开发复杂度明显上升

### 1.3 YAML/Markdown + 构建时转换

- 数据用 YAML 或 Markdown 维护，构建时转成 JSON
- 适合"内容为主"的场景（博客、文档站）
- **不推荐本项目**：游戏数据是结构化的，YAML/Markdown 反而增加维护成本，不如直接写 JSON

### 1.4 IndexedDB 缓存

- 浏览器端本地数据库，适合存用户个人数据
- **适合作为补充方案**：用户导入的英雄拥有情况、保存的阵容模板等个人数据存 IndexedDB
- 不替代服务端 JSON 数据源

### 1.5 GraphQL 层

- Astro 等框架提供构建时 GraphQL
- **不推荐**：本站不需要 GraphQL 的灵活性，Vite + React + fetch JSON 更简单

---

## 2. 推荐方案：JSON 文件 + 运行时加载 + IndexedDB 个人数据

### 2.1 架构

```
┌─────────────────────────────────────────┐
│  Git 仓库（数据源）                       │
│  public/data/                            │
│    champions.json                        │
│    adventures.json                       │
│    formations.json                       │
│    ...                                   │
│    version.json   ← 数据版本号            │
└──────────────┬──────────────────────────┘
               │ GitHub Actions 自动部署
               ↓
┌─────────────────────────────────────────┐
│  GitHub Pages（静态托管）                  │
│  /data/*.json  ← 浏览器 fetch 加载        │
└─────────────────────────────────────────┘

浏览器端：
- 公共数据：fetch JSON → 内存缓存（Session 内）+ Service Worker 缓存
- 个人数据：用户手动导入 → IndexedDB 存储
```

### 2.2 数据目录结构

```
idle-champions-site/
├── public/
│   └── data/
│       ├── champions.json          # 英雄数据
│       ├── adventures.json         # 冒险/变体
│       ├── formations.json         # 阵型布局
│       ├── patron-restrictions.json # Patron 限制
│       ├── enums.json              # 枚举值（race, role, tag 等）
│       └── version.json            # {"version": "2026.04.1", "date": "2026-04-12"}
├── src/
│   ├── data/
│   │   ├── loader.ts               # 数据加载 + 缓存逻辑
│   │   └── schema.ts               # TypeScript 类型定义
│   ├── components/
│   └── ...
├── vite.config.ts
└── package.json
```

### 2.3 数据更新工作流

```
游戏更新了新英雄/新活动
       ↓
编辑 public/data/ 下的 JSON 文件
       ↓
更新 version.json 版本号
       ↓
git commit + push（或 PR → merge）
       ↓
GitHub Actions 自动触发：
  1. npm run build
  2. 部署到 gh-pages 分支
       ↓
用户访问时：
  1. 检查 version.json
  2. 版本变化 → 清除旧缓存 → 重新 fetch
  3. 版本未变 → 使用缓存
```

### 2.4 前端数据加载示例

```typescript
// src/data/loader.ts
let cache: Map<string, any> = new Map();

export async function loadData<T>(name: string): Promise<T> {
  if (cache.has(name)) return cache.get(name);
  
  const version = await getVersion();
  const url = `/data/${name}.json?v=${version}`;
  const res = await fetch(url);
  const data = await res.json();
  
  cache.set(name, data);
  return data;
}

async function getVersion(): Promise<string> {
  const res = await fetch('/data/version.json', { cache: 'no-store' });
  const { version } = await res.json();
  return version;
}
```

---

## 3. 个人数据存储

用户个人数据（拥有的英雄、装备等级、保存的阵容等）使用 **IndexedDB** 存储：

- 纯本地，不上传服务器
- 浏览器关闭后持久保存
- 支持 structured clone，适合存复杂对象
- 可用 `idb` 库简化操作

```typescript
// 个人数据结构
interface UserProfile {
  ownedChampions: string[];        // 拥有的英雄 ID 列表
  championGear: Record<string, number[]>; // 英雄装备等级
  savedFormations: SavedFormation[];     // 保存的阵容
  preferences: UserPreferences;          // 用户偏好
}
```

---

## 4. 性能预估

| 数据文件 | 预估大小 | 加载时间（国内 CDN） |
|---------|---------|-------------------|
| champions.json | ~200-300 KB | < 500ms |
| adventures.json | ~50-100 KB | < 200ms |
| formations.json | ~30-50 KB | < 100ms |
| 其他枚举数据 | ~20 KB | < 50ms |
| **合计** | **~300-500 KB** | **首次 < 1s，缓存后 0** |

- 300-500 KB 的 JSON 数据量完全在合理范围内
- 首次加载后浏览器自动缓存
- Service Worker 可进一步保证离线可用

---

## 5. 总结

| 维度 | 方案 |
|------|------|
| 公共游戏数据 | JSON 文件 + 运行时 fetch + 版本化缓存 |
| 个人用户数据 | IndexedDB（纯本地存储） |
| 数据维护 | Git 仓库 + PR 流程 |
| 数据更新 | 编辑 JSON → push → Actions 自动部署 |
| 部署依赖 | 零服务端依赖，完美适配 GitHub Pages |

**不需要数据库。JSON 文件就是这个项目的最优解。**
