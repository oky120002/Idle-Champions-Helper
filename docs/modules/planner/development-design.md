# 自动阵型计划器开发设计

## 当前事实

- 站点是 `Vite + React + TypeScript` 静态站，生产部署在 GitHub Pages，必须继续兼容 `HashRouter` 与 `import.meta.env.BASE_URL`。
- 公共数据入口是 `npm run data:official`，会抓取中英文 definitions，归一化 `champions.json`、`champion-details/<id>.json`、`variants.json`、`formations.json`、`enums.json`、立绘、动画、专精图和宠物数据。
- 当前私人数据页支持 Support URL、手填凭证和日志文本的本地解析预览；用户点击手动同步后，浏览器请求官方只读接口并把归一化快照写入 IndexedDB。
- IndexedDB 已包含 `formationDrafts`、`formationPresets`、`userProfileSnapshots` 和可选 `credentialVault` store；默认同步流程不保存凭证。
- 本规划分支只写文档与 Ralph 任务契约；`src/` 实现必须交给 `.ralph/tasks/planner/prd.json` 后续 story。

## 目标架构

```text
public/data/v1/*              公共游戏基座数据
browser credential input       用户手动输入的凭证，只在前端内存中使用
IndexedDB user snapshot        归一化私人账号快照
src/domain/simulator/*         数字层、基线、effect、评分
src/domain/planner/*           场景、候选池、合法性、搜索和排序
src/pages/planner/*            自动计划工作台 UI
scripts/private-user-data/*    本机开发私有抓取和泄漏扫描
```

页面层只编排状态和展示。凭证解析、官方只读 client、用户快照、模拟器和 planner 搜索都要放在邻近领域模块中，避免把长规则写进 JSX。

## 分篇阅读

- 数据、隐私、目录与存储：`docs/modules/planner/development-design-data.md`
- 数字层、基线、模拟器、搜索、UI 与测试：`docs/modules/planner/development-design-simulator.md`

## 目录设计

- `src/data/user-sync/`：官方只读 client、allowlist、同步状态、payload normalizer。
- `src/data/user-profile-store/`：IndexedDB snapshot store 与可选 credential vault。
- `src/domain/user-profile/`：`UserProfileSnapshot`、`OwnedChampionState`、`ImportedFormationSave`、装备、feat、传奇和 warning 类型。
- `src/domain/simulator/`：`GameNumber`、最后专精基线、金币预算基线、英雄模拟 profile、effect parser、稳态评分。
- `src/domain/planner/`：variant rule projection、候选池、假设英雄公平基线、阵型合法性、beam search 和结果模型。
- `src/pages/planner/`：profile 状态面板、场景选择、候选模式、基线输入、结果卡和保存 preset 操作。
- `scripts/private-user-data/`：敏感扫描、私有 env loader、私有快照 manifest、后续只读抓取脚本。

## 执行约束

- Ralph 必须按 `.ralph/tasks/planner/acceptance-cases.md` 先写测试，再实现。
- 每个 story 只做指定范围，完成后单独 commit。
- UI 验收用 DOM、文本和状态断言，不用截图或图片识别。
- 任何无法静态计算的变量进入 warnings，不静默纳入 score。
