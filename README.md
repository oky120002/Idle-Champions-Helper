# Idle Champions 辅助站

《Idle Champions of the Forgotten Realms》辅助网站的开发仓库。

当前方向不是做“大而全百科”，而是先做一个更偏**个人成长导向的阵型决策台**：围绕资料查询、限制筛选、阵型编辑、候选英雄校验和方案保存，建立一条清晰、可解释、可维护的使用闭环。

仓库级强制规范见 `AGENTS.md`；本文件仅承载现状、结构、使用方式与文档导航。

## 当前状态

- 已确认技术路线：`Vite + React + TypeScript`
- 已落地最小可运行工程骨架
- 已补基础路由、页面壳层、公共数据目录与部署脚本
- 当前公共数据仍是占位文件，真实游戏数据待补充
- 个人数据本地存储方案已确定为 `IndexedDB`，但还未正式接入页面
- 当前仍处于早期阶段，完整规则体系与测试体系尚未完善

## 当前技术路线

- 前端：`Vite + React + TypeScript`
- 路由：`HashRouter`（MVP 默认方案）
- 部署：`GitHub Pages + GitHub Actions`
- 公共数据：`public/data/version.json + public/data/v1/*.json`
- 个人数据：浏览器本地优先，后续接 `IndexedDB`
- 规则层：集中放在 `src/rules/`，不把规则判断散落到页面组件里

## 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

检查基础代码规范：

```bash
npm run lint
```

## 当前目录结构

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docs/
│   ├── investigations/
│   ├── modules/
│   ├── product/
│   ├── research/
│   └── README.md
├── public/
│   └── data/
│       ├── version.json
│       └── v1/
│           ├── champions.json
│           ├── enums.json
│           ├── formations.json
│           └── variants.json
├── src/
│   ├── app/
│   ├── components/
│   ├── data/
│   ├── domain/
│   ├── pages/
│   ├── rules/
│   └── styles/
├── AGENTS.md
├── README.md
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 当前已经落地的内容

### 页面骨架

- `总览`
- `英雄筛选`
- `变体限制`
- `阵型编辑`
- `方案存档`

这些页面目前先承担结构验证与信息架构验证，不声称已经完成真实业务能力。

### 数据层约定

- `src/data/client.ts`：统一处理版本读取、路径拼接和基础缓存
- `src/domain/types.ts`：放数据类型定义
- `public/data/version.json`：声明当前数据版本
- `public/data/v1/*.json`：当前版本的数据文件

### 部署约定

- GitHub Pages 项目站
- GitHub Actions 官方 Pages 工作流
- 生产环境 `base` 路径按仓库名处理
- 第一阶段默认使用 `HashRouter`，避免 SPA 刷新 404 复杂度

## 文档导航

- `docs/README.md`：`docs/` 目录结构说明、归档规则与当前索引
- `docs/product/idle-champions-roadmap.md`：项目价值、范围、阶段路线、核心数据模型
- `docs/research/data/static-data-storage-research.md`：静态数据存储与版本化策略
- `docs/investigations/repository/github-directory-commit-investigation.md`：`.github` 目录无法提交的本地原因排查
- `docs/investigations/runtime/local-run-verification.md`：本地构建与预览可用性验证记录
- `docs/modules/user-data/user-data-import-design.md`：本地优先的个人数据导入方案与安全边界
- `docs/research/deployment/static-hosting-research.md`：GitHub Pages 部署方案与路由策略
- `docs/research/deployment/china-static-hosting-research.md`：国内访问体验研究存档，仅作背景参考，不作为正式发布路线依据

## 下一步建议

1. 补第一版真实 `Champion`、`Variant`、`FormationLayout` 数据结构
2. 先完成英雄筛选页的过滤闭环
3. 再接阵型编辑页的 seat 冲突校验
4. 最后补本地方案保存与个人画像能力

## 说明

- 当前仓库里所有中文文案、页面标题、README 和调研文档默认使用中文。
- 游戏术语或技术名词在没有稳定中文叫法时可保留原文；只要存在稳定中文叫法，就优先中文。
- 当前还没有真实游戏数据和完整业务逻辑，因此页面内容应视为工程骨架，而不是完成品。
