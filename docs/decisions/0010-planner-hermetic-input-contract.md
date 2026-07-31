# 0010. planner 计算器 hermetic 入参契约（纯函数，永不读登录态/数据源）

**Status**: Accepted
**Decided**: 2026-07-30（回填）

## 背景

planner 计算器需可纯函数单测、可在 Web Worker 跑、可在 CLI 丢 UI 输出 JSON（`npm run simulate`）。若计算器直接读 user profile / 登录态 / 文件 / IndexedDB，则 mock 困难、域外耦合、worker 不可用。需冻结「数据怎么进计算器」。本决策早于 ADR 约定，现回填。

## 决策

`src/domain/{planner,simulator,abilities}/` 是 hermetic 模块，三位一体约束：

- **域边界**：永不 import `src/data`/`src/app`/`src/components`/`src/pages`；非测试代码零 `fetch`/`readFileSync`/`indexedDB`/`loadCollection`。唯一非域依赖 `decimal.js`。由 `hermeticBoundary.test.ts` 守护，违规即 CI fail。
- **数据分类铁律**：系统基础数据（技能解锁等级、机制定义、英雄属性 / cost 曲线、patron / feat / 装备 / 怪物曲线）启动加载 / 缓存进 `PlannerCollections`，**非 per-call**；动态状态（英雄等级、阵型、场景、patron / blessing / feat / 专精选择、manualStackCount）才是 **per-call 入参**。
- **外部加成入参契约（约束③）**：计算器永不读登录态、永不直接读 profile 的 blessing/favor——后者已由 `userProfileNormalizer` 保留进 profile，由适配层聚合成 `globalBuffMultiplier` 传入；入参未传默认 1（`?? 1`）。

## 后果

- 正面：计算器可纯函数单测、可 worker 卸载、可 CLI；数据加载来源单一（`usePlannerCollections` 唯一调 `loadCollection` 处）。
- 代价：适配层须显式聚合外部加成（生产侧 UI 透传 phased 接入）。
- 风险：新需求易想「直接读 profile」，须守住入参契约；入参有冻结清单防「每次开发才发现某参数没传」。

## 替代方案

- **计算器直接读 profile / IndexedDB**：不选——破坏可测性、worker 不可用、域向外层耦合。
- **blessing/favor 直接进计算器**：不选——违背 hermetic；且其量随游戏变动属动态状态，应走入参而非内部读取。

## 关联

- 落地：`specs/modules/planner/architecture.md`（计算原则：Hermetic 边界 / 数据分类铁律 / 外部加成入参契约 / 入参契约冻结清单）
