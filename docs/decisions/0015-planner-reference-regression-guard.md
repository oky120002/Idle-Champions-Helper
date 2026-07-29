# 0015. 明斯克参照作重构回归守护（非绝对精度标尺）

**Status**: Accepted
**Decided**: 2026-07-30（回填）

## 背景

planner 反复重构加成计算（机制隔离等），需守护防「重构致偏差退化」。明斯克（hero_id=7）有实测伤害参照（`minsc7ReferenceData`）。但参照口径与生产计算口径不同，`damageReferenceVerification` 的 -32.7 偏差易被误读为「计算器错 32 个数量级」。需明确参照用途与口径分离。本决策早于 ADR 约定，现回填。

## 决策

明斯克参照（`damageReferenceVerification`）作为**重构回归守护**——重构前后偏差不退化即通过，**不**作为绝对精度标尺。口径分离是有意：

- **测试口径**（-32.7 偏差）：`singleSlot`（formationSize=1 无 support）+ `heroLevels=1`（abilities 多 requiredLevel 40+ 未解锁）+ globalBuff 用乘积（Π）而非 IC add pool（Σ）。是测试简化，**不反映生产**。
- **生产口径**：owned level（满级 abilities 全 active）+ scenario enemyTypes（vulnerability 匹配）+ `computeActual*` globalBuff（add pool）。
- **obs 口径**：明斯克「顺势斩」单次攻击伤害（非 DPS），formationSize=1。同 level 722 真实偏差 dev=-12.4（calc 2.05e50 vs obs 5.02e62）。

## 后果

- 正面：重构有客观回归线（偏差不退化），不被 -32.7 噪声误导。
- 代价：绝对精度是 ongoing 工作（剩余大头：feat wrapper / ability 升级 stacking / modron / 成就 / 药水 / gem / legendary 未建模），UI 须标「未校准」。
- 风险：新开发者误把测试偏差当 bug 修（本 ADR 钉死口径分离）。

## 替代方案

- **测试口径对齐生产**（owned level + add pool）：不选——失去 singleSlot/level1 的最小可控回归隔离，且生产口径依赖私有 profile 不可进 CI。
- **放弃 golden 守护**：不选——重构无回归线，机制隔离等改动无安全网。

## 关联

- 依据：`research/data/planner/damage-reference-calibration.md`（obs 口径 / 测试简化 / 剩余大头）
- 落地：`references/damageReferenceVerification.test.ts`
- 绝对值校准：`research/data/planner/bud-calibration.md`（见 ADR 0012 BUD vs DPS）
