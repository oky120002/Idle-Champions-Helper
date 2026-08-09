# 0003. 静态站数据存储：版本化 JSON + IndexedDB 四层分层

**状态**: Accepted
**决策日期**: 2026-07-27

## 背景

静态站（GitHub Pages）、无后端、数据低频写高频读，需选定公共数据与个人数据的物理存储方式，并固定分层以支持 diff、回溯与回滚。数据来源策略见 `decisions/0002-data-source-strategy.md`，本决策只回答「存成什么、放在哪」。

## 决策

公共数据用版本化 JSON，个人数据用 `IndexedDB`，并固定四层分层：

- 第一层 raw 快照：官方原始 `definitions`，存 `tmp/idle-champions-api/*.json`，供 diff 与 schema 排查。
- 第二层 归一化公共数据：输出 `public/data/version.json` + `public/data/v1/*.json`，字段少而稳，前端运行时 `fetch` 消费。
- 第三层 人工覆写层：`scripts/data/manual-overrides.json`，承载布局补丁、中文缺口、筛选标签等仓库内维护数据，与抓取 / 归一化产物分离。
- 第四层 个人数据：凭证与画像只存浏览器 `IndexedDB`，不进服务端、不进仓库。

集合文件统一为包裹对象（至少 `items` + `updatedAt`）；多分类字典（`effect-reference` / `patron-perks` / `trials`）按各自分类键组织，不强制 `items`。

## 后果

- 正面：数据与构建解耦，浏览器可独立缓存，版本切换 / 回滚自然；分层让 raw 排查、人工补丁、个人数据互不污染。
- 代价：需维护抓取 / 归一化 / 构建脚本入口与 `src/data/client.ts` 加载合同；体积需靠构建期守门，不能无节制铺二进制。
- 风险：`localStorage` 不承担正式个人画像或草稿持久化（容量与语义都不够）。

## 替代方案

- **PostgreSQL / Prisma / GraphQL**：不选——需在线后端，违背零后端预算与 GitHub Pages 约束。
- **浏览器端 SQLite WASM**：不选——过重，且 IndexedDB 已满足个人数据需求。
- **构建期把全部 JSON 打进 JS 包**：不选——数据与页面构建强耦合，浏览器无法独立缓存，版本切换不自然。

## 关联

- 依据：`research/data/static-data-storage-research.md`、`research/data/game-data-source/source-facts.md`
- 落地：`src/data/client.ts`（加载入口）、`src/data/localDatabase.ts`（IndexedDB）、`specs/guidelines/data-normalization.md`
- 上游决策：`decisions/0002-data-source-strategy.md`
