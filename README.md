# Idle Champions 辅助站

## 先看这里

### 我只想把项目跑起来看效果

按下面两步就够：

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4174
```

然后打开：

```text
http://127.0.0.1:4174/
```

说明：

- 当前本地看页面效果，**默认使用 `npm run dev`**
- 当前不要把 `npm run preview` 当作默认查看入口；生产 `base` 路径配置面向 GitHub Pages，本地直接预览容易白屏
- 本地运行验证记录见 `docs/investigations/runtime/local-run-verification.md`

### 我想知道这个项目怎么部署

当前正式发布路线已经定死为：

- 托管平台：`GitHub Pages`
- 自动发布：`GitHub Actions`
- 构建命令：`npm run build`
- 构建产物：`dist/`
- 路由策略：`HashRouter`

当前状态：

- 部署路线与约束已经确认
- 部署调研文档已经完成
- `.github/workflows/deploy.yml` 已经落库
- 现在只差 GitHub 仓库侧把 Pages 来源切到 `GitHub Actions`

如果要把部署真正跑通，最小步骤是：

1. 在 GitHub 仓库 `Settings -> Pages` 里把来源切到 `GitHub Actions`
2. push 到 `main` 后，由 Actions 构建 `dist/` 并发布
3. 首次发布后，再确认 Pages 站点地址与资源 `base` 路径是否一致

部署依据和细节见：

- `docs/research/deployment/static-hosting-research.md`
- `docs/research/deployment/china-static-hosting-research.md`

《Idle Champions of the Forgotten Realms》辅助网站的开发仓库。

当前方向不是做“大而全百科”，而是先做一个更偏**个人成长导向的阵型决策台**：围绕资料查询、限制筛选、阵型编辑、候选英雄校验和方案保存，建立一条清晰、可解释、可维护的使用闭环。

仓库级强制规范见 `AGENTS.md`；本文件仅承载现状、结构、使用方式与文档导航。

## 当前状态

- 已确认技术路线：`Vite + React + TypeScript`
- 已落地最小可运行工程骨架
- 已补基础路由、页面壳层与公共数据目录
- 已确认正式部署路线，并已补 GitHub Pages 自动部署工作流
- 当前公共数据仍是占位文件，真实游戏数据待补充
- 个人数据已补本地导入与脱敏解析骨架，真实同步仍待后续接入 `IndexedDB`
- 已补官方 definitions 抓取 / 归一化脚本骨架，方便后续接真实公共数据
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
npm run dev -- --host 127.0.0.1 --port 4174
```

构建生产版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

注意：

- 如果你只是想本地看页面效果，优先用 `npm run dev`
- `npm run preview` 当前更适合做部署链路排查，不适合作为默认人工预览入口
- 相关原因见 `docs/investigations/runtime/local-run-verification.md`

检查基础代码规范：

```bash
npm run lint
```

拉取官方 definitions 原始快照：

```bash
node scripts/fetch-idle-champions-definitions.mjs
```

把原始快照归一化为前端公共数据：

```bash
node scripts/normalize-idle-champions-definitions.mjs --input tmp/idle-champions-api/<your-snapshot>.json
```

一键执行“抓取 + 归一化”：

```bash
node scripts/build-idle-champions-data.mjs
```

说明：

- 原始 definitions 快照默认输出到 `tmp/idle-champions-api/`
- 手工补充层默认读取 `scripts/data/manual-overrides.json`
- 相关数据调研文档统一收纳在 `docs/research/data/`

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
├── scripts/
│   ├── data/
│   ├── fixtures/
│   ├── build-idle-champions-data.mjs
│   ├── fetch-idle-champions-definitions.mjs
│   └── normalize-idle-champions-definitions.mjs
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

说明：

- `docs/README.md` 是文档总索引；新增文档应按用途放入 `product/`、`research/`、`modules/`、`investigations/`
- 自动部署工作流的设计依据见 `docs/research/deployment/static-hosting-research.md`

## 当前已经落地的内容

### 页面骨架

- `总览`
- `英雄筛选`
- `变体限制`
- `阵型编辑`
- `方案存档`
- `个人数据`

这些页面目前先承担结构验证与信息架构验证，不声称已经完成真实业务能力。

### 数据层约定

- `src/data/client.ts`：统一处理版本读取、路径拼接和基础缓存
- `src/domain/types.ts`：放数据类型定义
- `public/data/version.json`：声明当前数据版本
- `public/data/v1/*.json`：当前版本的数据文件
- `scripts/fetch-idle-champions-definitions.mjs`：拉取官方 definitions 原始快照
- `scripts/normalize-idle-champions-definitions.mjs`：把原始快照转换为前端数据
- `scripts/data/manual-overrides.json`：维护自动抓取之外的补充数据

### 部署约定

- GitHub Pages 项目站
- GitHub Actions 官方 Pages 工作流
- 生产环境 `base` 路径按仓库名处理
- 第一阶段默认使用 `HashRouter`，避免 SPA 刷新 404 复杂度

## 文档导航

- `docs/README.md`：`docs/` 目录结构说明、归档规则与当前索引
- `docs/product/idle-champions-roadmap.md`：项目价值、范围、阶段路线、核心数据模型
- `docs/research/data/static-data-storage-research.md`：静态数据存储与版本化策略
- `docs/research/data/game-data-source-investigation.md`：基础游戏数据、个人数据凭证与第三方站点更新链路调研
- `docs/investigations/runtime/local-run-verification.md`：本地构建、开发预览与生产预览差异验证
- `docs/investigations/repository/github-directory-commit-investigation.md`：`.github` 目录无法提交的本地原因排查
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
