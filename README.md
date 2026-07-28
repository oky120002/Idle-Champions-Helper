# Idle Champions 辅助站

《Idle Champions of the Forgotten Realms》个人成长导向的阵型决策台。仓库级硬约束见 `AGENTS.md`，完整文档索引见 `docs/README.md`。

## 根本目标

阵型模拟器存在的意义：帮用户找到「当前英雄 × 当前阵型」的最优配置——哪个位置上谁，最大化三种队伍效益：

- **DPS 队**：推进更深的层数。
- **金币队**：获取最多的金币。
- **速度队**：最快地过层。

典型推进节奏：前期金币队快速抬高队伍英雄等级 → 中期速度队冲到能达到的层数 → 后期 DPS 队不停突破；或金币队推不动时直接切 DPS 队突破。

> 所有 planner 模块的开发不准偏离此目标：新特性要么服务于这三队之一，要么显式登记为架构文档里的后续目标。判定口径与计算原则见 `docs/specs/modules/planner/architecture.md`。

> **速度队缺口**（如实登记）：当前仅有 `HeroAbilityDimension.speed` 维度（`src/domain/abilities/abilityModel.ts`），尚未接入 `ScoringMode` 优化目标，登记为后续目标。

## 在线访问

- 正式地址：[https://oky120002.github.io/Idle-Champions-Helper/](https://oky120002.github.io/Idle-Champions-Helper/)
- 部署链路：`GitHub Pages + GitHub Actions`
- 常见操作与排障入口：`docs/runbooks/README.md`

## 当前范围

- 当前已路由页面：全文搜索、英雄筛选、用户英雄、英雄详情、立绘页、立绘页下的动图审片台、宠物图鉴、变体筛选、阵型编辑、方案存档、自动计划、个人数据
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
npm run privacy:scan
npm run build
npm run privacy:scan-build
npm run test:e2e
npm run test:regression
```

- `privacy:scan` 扫源码中的敏感凭证、私有路径和误提交风险。
- `privacy:scan-build` 扫 `dist/`，阻止 dev-only 私有快照端点、来源标识和本地私有路径进入生产产物。

## 数据相关命令

```bash
npm run data:official
npm run data:search
npm run data:signal-coverage
npm run private-user-data:fetch
npm run data:fetch
npm run data:normalize -- --input tmp/idle-champions-api/<english>.json --localizedInput tmp/idle-champions-api/<zh>.json
npm run data:portraits -- --input tmp/idle-champions-api/<english>.json
npm run data:console-portraits -- --input tmp/idle-champions-api/<english>.json
npm run data:illustrations
npm run data:animation-audit
npm run data:pets -- --input tmp/idle-champions-api/<english>.json --localizedInput tmp/idle-champions-api/<zh>.json
```

- `data:official` 是当前公共数据构建入口。
- `data:search` 基于 `public/data/v1/champions.json` 与 `champion-details/*.json` 抽取英雄文本，输出 `public/data/v1/search/search-documents.json`，随 `data:official` 主流程一起产出。
- `data:signal-coverage` 基于当前 `public/data/v1/champion-details/*.json` 统计 planner signal 覆盖率，用来判断下一刀该补哪类规则。
- 资源同步默认做两层跳过：先比对 `public/data/resource-sync-state.json` 的全局 `updatedAt`，未变新时整批跳过；进入具体资源脚本后，再按单资源的 source/version/manifest 复用已有文件，减少无效下载和仓库二进制改写。
- `private-user-data:fetch` 只在本地开发使用：用私有凭证抓官方只读用户 payload，写入 `tmp/private-user-data/`，供本地 Vite 调试导入；不会进入生产构建。
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
- 产品定义（价值 / 形态 / 技术模型 / 风险）：`docs/specs/product/README.md`
- 文档职责与精简策略：`docs/specs/guidelines/documentation-governance.md`
- 操作与排障手册：`docs/runbooks/README.md`
