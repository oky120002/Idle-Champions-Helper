# 0012. BUD vs DPS：相对比较用 DPS，绝对推图用 BUD

**Status**: Accepted
**Decided**: 2026-07-30（回填）

## 背景

阵型推荐需要相对比较（哪个阵型更强），推图层数预估需要绝对伤害对照怪物血量。DPS（每秒伤害）与 BUD（Biggest Unique Damage，阵型近期最高单次伤害）分别用于哪一侧，需明确以免用错量。本决策早于 ADR 约定，现回填。

## 决策

两者都算、用途分离：

- **阵型推荐（相对比较）**：DPS 足够，planner 用 `carryDps` 近似优化。
- **推图层数预估（绝对值）**：IC 怪物血量按 BUD 缩放，DPS 近似会偏差，BUD 更准。算法为二分查找 `max area where BUD（或 carryDps）>= monster_stat(area)`，结合 survival 约束（effectiveHealth 不足怪物伤害时限制推图层数）。
- BUD = `max over placed heroes of (heroDps × attackCooldown)`；慢攻击英雄单次伤害更高，更易成为 BUD setter。

## 后果

- 正面：各场景用更准的量；推图预估可对照怪物曲线。
- 代价：维护两套量；BUD 相关派生（click_damage 等）为 MVP 近似。
- 风险：绝对值未校准前须 UI 标注「未校准」（校准基线见 ADR 0015）。

## 替代方案

- **推图也用 DPS**：不选——怪物血量按 BUD 缩放，DPS 近似偏差大。
- **阵型推荐用 BUD**：不选——相对比较只需 DPS；BUD 偏好慢攻击英雄，不反映持续输出。

## 关联

- 依据：`research/data/planner/bud-calibration.md`、`research/data/planner/monster-and-area-scaling.md`
- 落地：`specs/modules/planner/architecture.md`（BUD 与 DPS 的取舍）、`simulator.md`、`computation-runtime.md`
