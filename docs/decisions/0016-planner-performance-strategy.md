# 0016. planner 性能策略：候选裁剪 + Web Worker 卸载

**状态**: Accepted
**决策日期**: 2026-07-30（回填）

## 背景

beam search 对「每个槽位 × 每个候选英雄」都跑一次全阵型求值，全英雄 worst case ~8s，主线程同步跑致 UI 完全冻结（连 loading 都画不出）。需性能策略且不损结果正确性。本决策早于 ADR 约定，现回填。

## 决策

三策组合（不改算法、不改结果）：

- **计算模式候选裁剪**（`computationMode` `full`/`p90`/`p50`，默认 `p50`）：build 期预计算各英雄各维度收益（`gainProfile`），运行时按席位取 top 比例候选（每席位至少 1 + forced 英雄保留），精确限制匹配仍在 `scoreFormation` 做。裁剪决定「试不试谁」，不决定「算成多少」。实测 `p50` 约减半时间（~8.2s→~4.4s worst case）。
- **Web Worker 卸载**：计算移 worker，数据加载留主线程（UI 需 variants/championById 渲染）；worker init 缓存 `plannerHeroes + plannerScenarios`，之后只传 `variant + profileSnapshot + options/placements`；UI 端 debounce（~150ms）+ `requestId` 递增丢弃旧结果。
- 默认 beam width 8（保守，防 objectiveValue 塌方）。

## 后果

- 正面：`p50` 把真实体感压到 1 秒级；worker 消除 UI 冻结；结果与 `full` 等价（裁剪只影响候选集，非计算口径）。
- 代价：worker 启动 + 首次 collections 传输一次性 ~50-100ms；主线程 + worker 各持一份 collections（静态站可接受）。
- 风险：`p50` 偶发丢精度，用户可一键切 `full`。

## 替代方案

- **增量求值**：不选——经深入调研确认严格等价下不可行：632 个 count-dependent signal（`per_crusader`/`per_hero_attribute`/`per_tagged_crusader_mult`/`per_target_crusader`/`per_upgrade_targets`，96% 英雄）的 multiplier 依赖整队计数，加入英雄会改变已有 `(carry,support)` 对结果；严格增量须对已有对反向更新并传播到所有 carry，每步 Ω(N²)，与全量同级。
- **降 beam 宽度**：不选——benchmark 实测 `beamWidth=4` 多数 variant 无损但偶发 objectiveValue 塌方、`≤3` 候选多的 variant 直接崩溃，非可靠加速。

## 关联

- 落地：`specs/modules/planner/simulator.md`（计算模式 / 增量求值不可行）、`computation-runtime.md`（Web Worker 架构）
