# Idle Champions 辅助站

《Idle Champions of the Forgotten Realms》辅助网站的开发仓库。

当前方向不是做“大而全百科”，而是先做一个更偏**个人成长导向的阵型决策台**：围绕资料查询、限制筛选、阵型编辑、候选英雄校验和方案保存，建立一条清晰、可解释、可维护的使用闭环。

仓库级强制规范见 `AGENTS.md`；本文件仅承载现状、结构、使用方式与文档导航。

## 在线访问

- 正式地址：[https://oky120002.github.io/Idle-Champions-Helper/](https://oky120002.github.io/Idle-Champions-Helper/)
- 当前部署方式：`GitHub Pages + GitHub Actions`
- 问题排查台账：[`docs/troubleshooting-log.md`](docs/troubleshooting-log.md)

## 当前状态

- 已确认技术路线：`Vite + React + TypeScript`
- 已落地最小可运行工程骨架
- 已补基础路由、页面壳层、公共数据目录与部署脚本
- 已落第一版真实公共数据：`champions`、`variants`、`enums`、`formations` 已由官方 definitions 自动生成，其中阵型布局已覆盖 157 个唯一官方布局
- 已补第一版官方中文映射层：`champions / affiliations / campaigns / variants` 保留“官方原文 + 中文展示名”双字段
- 已把 161 名可上阵英雄的官方头像按版本写入 `public/data/v1/champion-portraits/`，并在英雄相关卡片里接入展示
- 已补第一版界面语言切换，页面可在中文 / 英文界面之间切换
- 已落最小测试基础设施：`Vitest`、`React Testing Library`、`Playwright`
- 阵型页已接入“最近草稿”本地自动保存 / 恢复，持久化介质为 `IndexedDB`
- 方案存档页已落第一版命名方案库：支持保存、编辑、删除、恢复回阵型页
- 个人数据页已接入 `Support URL / 手动填写 / 日志文本` 三种本地解析与校验骨架
- 当前浏览器内的命名方案与最近草稿都已由 `IndexedDB` 承载
- 已补官方 definitions 原文 + `language_id=7` 中文双快照抓取 / 归一化脚本
- 已补 GitHub Pages 基线路径本地预览脚本：`npm run preview:pages`
- 当前仍处于早期阶段，完整规则体系与测试覆盖都还在继续补齐

## 当前技术路线

- 前端：`Vite + React + TypeScript`
- 路由：`HashRouter`（MVP 默认方案）
- 测试：`Vitest + React Testing Library + Playwright`
- 部署：`GitHub Pages + GitHub Actions`
- 公共数据：`public/data/version.json + public/data/v1/*.json`
- 个人数据：浏览器本地优先，当前以 `IndexedDB` 承载最近草稿与命名方案
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

按 GitHub Pages 基线路径预览构建结果：

```bash
npm run preview:pages
```

检查基础代码规范：

```bash
npm run lint
```

执行类型检查：

```bash
npm run typecheck
```

执行 Vitest 回归：

```bash
npm run test:run
```

分别执行单元 / 组件测试：

```bash
npm run test:unit
npm run test:component
```

首次安装 Playwright 浏览器：

```bash
npm run playwright:install
```

执行浏览器级回归：

```bash
npm run test:e2e
```

执行完整回归（本地 lint + typecheck + Vitest + Playwright）：

```bash
npm run test:regression
```

拉取官方 definitions 原始快照：

```bash
npm run data:fetch
```

把原始快照归一化为前端公共数据：

```bash
npm run data:normalize -- --input tmp/idle-champions-api/<english-snapshot>.json --localizedInput tmp/idle-champions-api/<zh-snapshot>.json
```

把官方头像资源同步到版本化公共目录：

```bash
npm run data:portraits -- --input tmp/idle-champions-api/<english-snapshot>.json
```

一键执行当前所有可公开拉取的官方基座数据更新：

```bash
npm run data:official
```

当前该命令会同步拉取并更新：

- 官方原文 definitions 快照
- `language_id=7` 中文 definitions 快照
- `champions / variants / formations / enums` 归一化公共数据
- 官方英雄头像资源

说明：

- 这是当前“所有可公开拉取的官方基座数据”的统一入口
- 个人账号数据仍需要用户凭证，不在这个命令里

- `npm run preview` 只适合确认 `dist/` 已被预览服务拉起，不适合作为 GitHub Pages 路径验收入口
- `npm run preview:pages` 会按 `/Idle-Champions-Helper/` 基线路径提供更贴近生产的本地预览
- 原始 definitions 快照默认输出到 `tmp/idle-champions-api/`
- 手工补充层默认读取 `scripts/data/manual-overrides.json`，当前主要用于必要覆写，不再承担阵型布局主数据
- 详细调研结论见 `docs/research/data/game-data-source-investigation.md`
- `language_id=7` 官方中文覆盖结论见 `docs/research/data/language-id-7-chinese-definitions-research.md`
- 官方阵型布局字段与唯一布局提取结论见 `docs/research/data/official-formation-layout-extraction-research.md`
- 官方头像字段与资源尺寸核实见 `docs/research/data/champion-portrait-asset-research.md`

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
│   ├── normalize-idle-champions-definitions.mjs
│   └── sync-idle-champions-portraits.mjs
├── public/
│   └── data/
│       ├── version.json
│       └── v1/
│           ├── champion-details/
│           ├── champion-portraits/
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
- `public/data/v1/champion-details/<hero-id>.json`：单个英雄的结构化详情与原始 definitions 快照片段
- `public/data/v1/*.json`：当前版本的数据文件
- `public/data/v1/champion-portraits/`：当前版本的官方英雄头像 PNG 资源
- `scripts/fetch-idle-champions-definitions.mjs`：拉取官方 definitions 原始快照
- `scripts/normalize-idle-champions-definitions.mjs`：把原始快照转换为前端数据，并自动提取官方阵型布局
- `scripts/sync-idle-champions-portraits.mjs`：把官方 mobile assets 里的英雄头像拉到版本化公共目录
- `scripts/data/manual-overrides.json`：维护自动抓取之外的必要覆写与补充数据

### 部署约定

- GitHub Pages 项目站
- GitHub Actions 官方 Pages 工作流
- 生产环境 `base` 路径按仓库名处理
- 第一阶段默认使用 `HashRouter`，避免 SPA 刷新 404 复杂度

## 文档导航

完整清单与放置规则以 `docs/README.md` 为准；这里仅保留高频入口。

- 总索引与治理：
  - `docs/README.md`
  - `docs/product/documentation-governance.md`
  - `docs/troubleshooting-log.md`
- 产品与路线：
  - `docs/product/idle-champions-roadmap.md`
- 数据与部署：
  - `docs/research/data/game-data-source-investigation.md`
  - `docs/research/data/static-data-storage-research.md`
  - `docs/research/data/language-id-7-chinese-definitions-research.md`
  - `docs/research/data/official-formation-layout-extraction-research.md`
  - `docs/research/data/champion-portrait-asset-research.md`
  - `docs/research/deployment/static-hosting-research.md`
  - `docs/research/deployment/china-static-hosting-research.md`
  - `docs/research/testing/regression-testing-research.md`
- 模块设计：
  - `docs/modules/champions/champions-filter-design.md`
  - `docs/modules/formation/formation-editor-design.md`
  - `docs/modules/presets/presets-design.md`
  - `docs/modules/user-data/user-data-import-design.md`
- 运行与排查：
  - `docs/investigations/runtime/local-run-verification.md`
  - `docs/investigations/runtime/playwright-browser-launch-verification.md`
  - `docs/investigations/repository/github-directory-commit-investigation.md`（历史排查归档）

## 下一步建议

1. 把 `scenarioRef` 与 `FormationLayout` 的适用场景接成真实上下文
2. 补 `Patron / 模式过滤`、seat 冲突和候选英雄约束闭环
3. 基于已通过的 Playwright 验收继续扩充页面回归，并把个人数据导入结果安全写入 `IndexedDB`
4. 扩展个人画像与非阵型类本地数据能力

## 说明

- 当前仓库里所有中文文案、页面标题、README 和调研文档默认使用中文。
- 游戏术语或技术名词在没有稳定中文叫法时可保留原文；只要存在稳定中文叫法，就优先中文。
- 当前已接入第一版真实公共数据与本地持久化闭环，但规则完整度、个人进度映射和推荐层仍处于早期阶段，页面不应视为完成品。
