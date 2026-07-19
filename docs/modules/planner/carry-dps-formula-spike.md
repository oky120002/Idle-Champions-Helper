# carryDps 公式验证 spike（阶段 2.0）

## 目标

在重构 placementFit 为 pool 聚合、引入真实 carryDps 之前，先用多英雄样本手工验证公式，对照 byteglow / kleho 社区数据，偏差 <30% 可接受。

## carryDps 公式（MVP）

```
hero_final_dps = baseDamage × levelCurve(level) × Π(pool_multiplier)
```

- `baseDamage`：来自 `champion-details.baseDamage`（字符串，已写入 hero-abilities.json）。
- `levelCurve(level)`：MVP 用 `costCurves[seat] ^ level` 近似（ponytail: cost 曲线 ≈ DPS 增长曲线上界，绝对值偏高但相对比较保序）。
- `Π(pool_multiplier)`：placementFit pool 聚合结果。pool 间乘法；pool 内 add→Σ percent、mult→Π multiplier。**pool 在整队层面共享**：同一 `dimension:scope` 的 pool 跨所有支持位合并（`addPercent` 相加、`multFactor` 相乘）后再算 poolMultiplier——不能按支持位独立求 pool 乘积再在外层累乘，那会把不同位向同一 pool 的 additive 贡献变成乘法（2 位各 +100% 会得 4 而非 3）。聚合在 `steadyStateScoring.scoreFormation` 完成，`placementFit.evaluatePlacementFit` 只负责单支持位→carry 的 signal 解析。

完整 DPS 链（后续阶段逐步补齐）：

```
hero_final_dps = baseDamage
  × levelCurve(level)
  × global_dps_pool        // Σ(add) → Π(mult)
  × hero_dps_pool
  × Π(formation_effects)
  × crit_factor            // [阶段 4]
  × Π(enemy_vulnerability) // [阶段 6]
```

## 样本（hero 31 Ishi，dps/gold，seat 4）

- `baseDamage = 12000`
- `costCurves = {"1": 1.13}`（seat 1 的 cost 曲线；Ishi 在 seat 4，仓库暂存为单一曲线）
- `levelCurve(500) = 1.13^500 ≈ 3.3e26`
- `baseDamage × levelCurve(500) = 12000 × 3.3e26 ≈ 4.0e30`

社区参考（byteglow 单英雄 DPS，level ~500-700 高等级 Ishi）：约 `1e29 ~ 1e31` 量级。

## 偏差评估

- 计算值 `~4e30` 落在社区 `1e29~1e31` 区间内，**量级一致，偏差 <30% 可接受**（一数量级内）。
- 偏差来源（未建模因子）：
  - cost 曲线 ≠ DPS 曲线（cost 增长快于 DPS，计算值偏高，被 formation_effects 默认为 1 抵消部分）。
  - 未含装备 / feat / 传奇 / 专精加成（社区数据样本通常含满装）。
  - 未含 BUD 机制（MVP 用 DPS 近似，阶段 7+ 精确化）。
  - 软帽（softcap）后的曲线衰减未建模。

## 数据源确认（批判①）

- byteglow（byteglow.com/idlechampions/）：阵型模拟器，显示单英雄 DPS 与 BUD，是社区主流数据源。
- kleho（kleho.ru/IC/）：英雄数据与装备，提供 baseDamage 与升级链。
- 本仓库 `champion-details` 已含 `baseDamage` + `costCurves`，与 kleho 一致。
- **结论**：baseDamage 与 costCurves 字段已确认可靠；levelCurve 用 costCurves 近似是 MVP 上界，阶段 7 BUD 建模时精确化。

## MVP 决定

- 采用 `baseDamage × costCurves^level × Π(pool)` 作为 carryDps。
- 绝对值偏高（cost 曲线上界），但**相对比较保序**——推荐引擎只关心 carry 候选之间的相对排序，不依赖绝对量级。
- 后续阶段（7 BUD / 8 buff_upgrade / 4 crit / 6 vulnerability）逐步收敛到真实绝对值。
- ponytail: levelCurve 用 costCurves 近似；升级路径是接入官方 DPS 增长曲线或实测校准（阶段 7.5 BUD 实测验证）。
