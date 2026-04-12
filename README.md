# Idle Champions

《Idle Champions of the Forgotten Realms》辅助网站的调研与规划目录。

当前目标不是做一个“大而全百科”，而是逐步落地一个更偏“个人成长导向的阵型决策台”的工具站，优先服务资料查询、限制筛选、阵型编辑、候选英雄校验和方案保存。

## 当前状态

- 当前目录以调研文档为主，尚未初始化前端工程、数据脚本或部署配置。
- 现阶段已经完成产品方向、静态部署、数据存储和国内托管备选方案的初步整理。
- 还没有可执行的 `dev`、`build`、`test` 命令；如果开始编码，应先确认 MVP 范围和技术路线，再补最小可运行骨架。

## 项目方向

- 产品定位：个人成长导向的阵型决策台
- 第一阶段重点：
  - 英雄/冒险/限制条件查询
  - Patron / Variant 等限制下的候选英雄筛选
  - 阵型编辑与 seat 冲突校验
  - 阵容保存与对比
- 当前不优先做：
  - 全自动最优阵容求解器
  - 完整伤害模拟器
  - 大而全百科式页面矩阵

## 当前目录

```text
.
├── AGENTS.md
├── README.md
└── docs/
    ├── china-static-hosting-research.md
    ├── idle-champions-research-roadmap.md
    ├── static-data-storage-research.md
    └── static-hosting-research.md
```

## 文档导航

### `docs/idle-champions-research-roadmap.md`

项目主路线文档，包含：

- 项目价值判断
- 竞品拆解
- MVP 边界
- 分阶段实施路线
- 建议优先建设的数据模型

适合在开始编码、定义范围、排第一版页面时优先阅读。

### `docs/static-data-storage-research.md`

用于约束数据层方向，当前结论是：

- 公共游戏数据优先使用版本化 JSON 文件
- 前端优先运行时加载数据
- 个人数据优先 local-first，存储在浏览器本地

适合在定义 `Champion`、`Adventure`、`Variant`、`UserProfile` 等结构时参考。

### `docs/static-hosting-research.md`

用于约束静态部署方案，当前调研默认围绕 `Vite + React` 静态站展开，主推荐方案为：

- GitHub Pages
- GitHub Actions 自动部署
- 处理好 GitHub Pages Project 站的 `base` 路径
- 处理好 SPA 路由回退问题

适合在初始化前端工程、补部署流程时参考。

### `docs/china-static-hosting-research.md`

用于评估国内访问体验和替代托管平台，当前结论是：

- 默认仍优先 GitHub Pages
- 如果后续访问质量不足，再评估 Cloudflare Pages 或国内方案

适合在上线前或需要优化国内访问时参考。

## 当前技术倾向

以下内容来自现有调研结论，属于当前默认方向，不代表已经落地：

- 前端：静态站方向，优先考虑 `Vite + React`
- 部署：`GitHub Pages + GitHub Actions`
- 公共数据：版本化静态 JSON
- 个人数据：浏览器本地存储，优先 IndexedDB
- 规则层：集中维护，不把 Patron、Variant、阵位限制散落到页面组件里

如果后续确认改用其他框架或部署方式，应同步更新本目录文档和 `AGENTS.md`。

## 继续推进时的建议顺序

1. 从 `docs/idle-champions-research-roadmap.md` 收敛第一版页面范围
2. 明确核心实体和字段：`Champion`、`Adventure`、`Variant`、`FormationLayout`、`UserProfile`
3. 初始化最小可运行前端骨架
4. 搭建公共数据目录和版本号策略
5. 再补规则层、筛选逻辑和阵型编辑器

## 文档维护约定

- 技术路线、目录结构、部署方案或数据方案发生实质变化时，应同步更新对应调研文档。
- 如果后续新增实际工程文件，应补充启动、构建、数据更新和部署说明。
- 在没有仓库事实支撑前，不要把 README 写成“已实现”的状态说明。
