# Idle Champions 辅助站

《Idle Champions of the Forgotten Realms》辅助网站开发仓库。

仓库级强制规范见 `AGENTS.md`；本文只保留项目定位、现状、命令与文档入口。

## 在线访问

- 正式地址：[https://oky120002.github.io/Idle-Champions-Helper/](https://oky120002.github.io/Idle-Champions-Helper/)
- 部署方式：`GitHub Pages + GitHub Actions`
- 问题排查：`docs/troubleshooting-log.md`

## 项目定位

- 目标不是“大而全百科”或全自动最优解模拟器，而是个人成长导向的阵型决策台
- 第一阶段聚焦：资料查询、限制筛选、阵型编辑、候选英雄校验、方案保存
- 公共游戏数据走版本化静态文件；个人数据坚持浏览器本地优先

## 当前现状

- 技术路线已固定为 `Vite + React + TypeScript + HashRouter`
- 已有真实公共数据：`champions`、`variants`、`enums`、`formations`
- 已接入官方中文映射、英雄头像、英雄与皮肤立绘资源
- 已支持中英文界面切换
- 已完成基础页面骨架：`总览`、`英雄筛选`、`变体限制`、`阵型编辑`、`方案存档`、`个人数据`
- 阵型页支持最近草稿自动保存 / 恢复；方案存档页支持保存、编辑、删除、恢复
- 个人数据页已有 `Support URL / 手动填写 / 日志文本` 三种本地解析与校验骨架
- 测试基础设施已落地：`Vitest`、`React Testing Library`、`Playwright`
- 项目仍处于早期阶段，规则体系与测试覆盖会继续补齐

## 技术与目录

- 前端：`Vite + React + TypeScript`
- 路由：`HashRouter`
- 测试：`Vitest + React Testing Library + Playwright`
- 部署：`GitHub Pages + GitHub Actions`
- 公共数据：`public/data/version.json` 与 `public/data/v1/*.json`
- 个人数据：浏览器本地优先，当前由 `IndexedDB` 承载最近草稿与命名方案
- 规则层：集中在 `src/rules/`

```text
src/            页面、组件、领域模型、规则与样式
public/data/    版本化公共数据与静态资源
scripts/        数据抓取、归一化、资源同步脚本
docs/           产品、研究、模块与排障文档
.github/workflows/ GitHub Pages 部署流程
```

## 本地开发

```bash
npm install
npm run dev
npm run build
npm run preview
npm run preview:pages
```

## 验证命令

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:unit
npm run test:component
npm run playwright:install
npm run test:e2e
npm run test:regression
```

说明：

- `npm run preview` 只适合确认 `dist/` 预览服务是否启动
- `npm run preview:pages` 会按 `/Idle-Champions-Helper/` 基线路径预览，更接近生产环境
- `npm run test:regression` 会串行执行 `lint + typecheck + Vitest + Playwright`

## 数据命令

```bash
npm run data:fetch
npm run data:normalize -- --input tmp/idle-champions-api/<english>.json --localizedInput tmp/idle-champions-api/<zh>.json
npm run data:portraits -- --input tmp/idle-champions-api/<english>.json
npm run data:illustrations -- --input tmp/idle-champions-api/<english>.json
npm run data:official
```

- `data:official` 是当前所有可公开拉取官方基座数据的统一入口
- 原始快照默认输出到 `tmp/idle-champions-api/`
- 个人账号数据不在这些命令里

## 文档入口

- 文档总索引：`docs/README.md`
- 数据调研：`docs/research/data/`
- 产品规范：`docs/product/`
- 模块设计：`docs/modules/`
- 调查与排障：`docs/investigations/`、`docs/troubleshooting-log.md`
