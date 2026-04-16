# Idle Champions 辅助站

《Idle Champions of the Forgotten Realms》个人成长导向的阵型决策台。仓库级硬约束见 `AGENTS.md`，完整文档索引见 `docs/README.md`。

## 在线访问

- 正式地址：[https://oky120002.github.io/Idle-Champions-Helper/](https://oky120002.github.io/Idle-Champions-Helper/)
- 部署链路：`GitHub Pages + GitHub Actions`
- 常见排查入口：`docs/troubleshooting-log.md`

## 当前范围

- 已有页面：总览、英雄筛选、英雄详情、立绘页、变体限制、阵型编辑、方案存档、个人数据
- 公共数据：`public/data/version.json` 与 `public/data/v1/*.json`
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
npm run data:illustrations
```

- `data:official` 是当前公共数据构建入口。
- 原始快照默认写入 `tmp/idle-champions-api/`。
- 个人账号数据不走这组命令。

## 仓库入口

- `src/`：页面、组件、领域模型、规则与样式
- `public/data/`：版本化公共数据与静态资源
- `scripts/`：数据抓取、归一化、资源同步与预览脚本
- `tests/e2e/`：Playwright 用例
- `docs/`：产品、调研、模块设计与排障文档

## 进一步阅读

- 文档总索引：`docs/README.md`
- 项目路线与范围：`docs/product/idle-champions-roadmap.md`
- 文档职责与精简策略：`docs/product/documentation-governance.md`
- 问题排查台账：`docs/troubleshooting-log.md`
