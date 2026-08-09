# 0009. 推算引擎用真实目标量 carryDps + pool 聚合 + beam search

**状态**: Accepted
**决策日期**: 2026-07-30（回填）

## 背景

planner 要在「拥有英雄 × 阵型 × 场景限制」下推算最优上场英雄与站位。早期版本用启发式 `score` + `heuristicRoleMultiplier` + `isCarryViable` 给英雄打分；需确定推算引擎优化什么、怎么搜。本决策随 planner 开发确立，早于 ADR 约定（0006），现回填。

## 决策

推算引擎用「真实目标量 + pool 聚合 + deterministic beam search」：

- `placementFit` 是 pool 聚合器（pool 内 add 相加 / mult 相乘，pool 间乘法），产出**真实目标量**而非启发式评估：carry-dps 模式 = `carryDps`，team-gold 模式 = `teamGoldFind`，均 GameNumber。
- 搜索单位是**完整阵型**（有且仅一个主 C 位），deterministic beam search 按目标量最大化，同分 deterministic tie-breaker。
- 按本地优先、可解释、可验证原则推算最优阵型，输出可追溯加成拆解（`SimulationBreakdown`），不做无法追溯的黑盒。
- 旧 `score` / `heuristicRoleMultiplier` / `isCarryViable` 淘汰。

## 后果

- 正面：目标量可比、可拆解、可回归（明斯克 golden 守护）；算法与英雄唯一握手点 `HeroAbilityProfile`。
- 代价：beam search 非全局最优（top-K 近似）；全英雄 worst case ~8s（由 ADR 0016 性能策略解决）。
- 风险：pool 聚合语义混淆曾致 bug（两个 +100% 易伤算成 4 非 3，已修并加回归）。

## 替代方案

- **启发式打分**（`score`/`heuristicRoleMultiplier`）：不选——掩盖真实量级、难校准、难拆解、难回归。
- **黑盒全自动最优解**：不选——违背可解释 / 可验证定位，本地零预算跑不动逐帧精确模拟。

## 关联

- 依据：`research/data/planner/*`（BUD / 机制 / 信号覆盖证据）
- 落地：`specs/modules/planner/architecture.md`（三层架构）、`simulator.md`（加成聚合与 DPS 公式）
