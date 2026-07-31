# 0011. 投影模式 aggregateProjection：阵型倍率 vs 绝对 DPS 双模

**Status**: Accepted
**Decided**: 2026-07-30（回填）

## 背景

阵型模拟器本质是「阵型内 signal 聚合器」，但用户也想知道绝对 DPS / 推图层数。游戏只给全量数据（含阵型外全局加成），无纯阵型数据。需区分「阵型内贡献」与「绝对量」，并避免与既有计算模式概念混淆。本决策早于 ADR 约定，现回填。

## 决策

入参 `aggregateProjection` 双模：

- **`formation-buff`（默认）**：`objectiveValue` = 阵型内 signal 聚合因子（damagePool × crit × vuln），**不含** baseDamage / levelCurve / 外部加成。对照止于阵型倍率。
- **`absolute-dps`**：`objectiveValue` = baseDamage × levelCurve × damagePool × crit × vuln × globalBuff × equipmentAdj。绝对量未校准（baseDamage / BUD 未校准），仅作 BUD 校准回归基线。
- **命名锁**：禁止复用 `ComputationMode`——该名已用于 beam-search 候选裁剪（`computationMode.ts`，`full|p90|…|p50`），两者正交。

## 后果

- 正面：阵型推荐（相对比较）与绝对量校准各走各的，不互相污染。
- 代价：两套 objectiveValue 口径，消费方须显式选模式。
- 风险：命名碰撞（已用命名锁规避）。

## 替代方案

- **只保留绝对 DPS**：不选——baseDamage / BUD 未校准时绝对量无意义，且阵型推荐只需相对比较。
- **复用 `ComputationMode` 名**：不选——与候选裁剪语义正交，复用致歧义。

## 关联

- 落地：`specs/modules/planner/architecture.md`（投影模式，约束②）
- 绝对值校准：`research/data/planner/bud-calibration.md`（见 ADR 0015 校准基线）
