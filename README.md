# Idle Champions 辅助站

《Idle Champions of the Forgotten Realms》个人成长导向的阵型决策台。仓库级硬约束见 `AGENTS.md`，完整文档索引见 `docs/README.md`。

## 在线访问

- 正式地址：[https://oky120002.github.io/Idle-Champions-Helper/](https://oky120002.github.io/Idle-Champions-Helper/)
- 部署链路：`GitHub Pages + GitHub Actions`
- 常见排查入口：`docs/troubleshooting-log.md`

## 当前范围

- 当前已路由页面：英雄筛选、英雄详情、立绘页、立绘页下的动图审片台、宠物图鉴、变体筛选、阵型编辑、方案存档、自动计划、个人数据
- 根路由 `/` 当前直接重定向到英雄筛选页；仓库里仍保留未挂路由的 `HomePage` 草稿，但它不是当前线上入口
- 公共数据：`public/data/version.json` 与 `public/data/v1/*.json`，其中包含英雄 / 宠物静态图索引、`champion-animations.json`、`pet-animations.json` 动图清单，以及 `champion-animation-audit.json` 本地审片清单
- 动图审片台 `#/illustrations/audit` 支持勾选人工结论、问题标签与备注，并可一键复制 JSON 反馈
- 英雄 idle 动图的人工覆写沉淀在 `scripts/data/champion-animation-idle-overrides.json`
- 本地数据：最近草稿与命名方案使用 `IndexedDB`
- 当前回归基线：`Vitest`、`React Testing Library`、`Playwright`

## 快速开始

```bash
npm install
npm run dev
npm run build
npm run preview:pages
```

- `npm run preview:pages` 会按 GitHub Pages 基线路径启动预览，更接近生产环境。
- 仅查看 `dist/` 时可使用 `npm run preview`。

## 常用验证

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run test:regression
```

## 数据相关命令

```bash
npm run data:official
npm run data:fetch
npm run data:normalize -- --input tmp/idle-champions-api/<english>.json --localizedInput tmp/idle-champions-api/<zh>.json
npm run data:portraits -- --input tmp/idle-champions-api/<english>.json
npm run data:console-portraits -- --input tmp/idle-champions-api/<english>.json
npm run data:illustrations
npm run data:animation-audit
npm run data:pets -- --input tmp/idle-champions-api/<english>.json --localizedInput tmp/idle-champions-api/<zh>.json
```

- `data:official` 是当前公共数据构建入口。
- `data:animation-audit` 会基于站内 `.bin` 和 `champion-animations.json` 重新生成本地 idle 候选审片清单。
- `sync-idle-champions-animations.mjs` / `audit-idle-champions-animations.mjs` 默认会读取 `scripts/data/champion-animation-idle-overrides.json`。
- 原始快照默认写入 `tmp/idle-champions-api/`。
- 个人账号数据不走这组命令。

## 仓库入口

- `src/`：页面容器、按页面拆分的子目录、共享特性模块、组件、领域模型、规则与样式
- `src/features/`：跨页面复用的筛选、展示与交互特性模块
- `public/data/`：版本化公共数据与静态资源
- `scripts/`：数据抓取、归一化、资源同步与预览脚本
- `tests/e2e/`：Playwright 用例
- `docs/`：产品、调研、模块设计与排障文档

## 进一步阅读

- 文档总索引：`docs/README.md`
- 项目路线与范围：`docs/product/idle-champions-roadmap.md`
- 文档职责与精简策略：`docs/product/documentation-governance.md`
- 问题排查台账：`docs/troubleshooting-log.md`
