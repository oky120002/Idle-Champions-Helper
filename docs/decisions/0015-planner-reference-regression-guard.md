# 0015. 明斯克参照作重构回归守护（非绝对精度标尺）

**Status**: Accepted
**Decided**: 2026-07-30（回填）

## 背景

planner 反复重构加成计算（机制隔离等），需守护防「重构致偏差退化」。明斯克（hero_id=7）有实测伤害参照（`minsc7ReferenceData`）。但参照口径与生产计算口径不同，`damageReferenceVerification` 的偏差易被误读为「计算器错几十个数量级」。需明确参照用途与口径分离。本决策早于 ADR 约定，现回填。

## 决策

明斯克参照（`damageReferenceVerification`）作为**重构回归守护**——重构前后偏差不退化即通过，**不**作为绝对精度标尺。口径分离是有意：

- **测试口径**：`singleSlot`（formationSize=1 无 support）+ `heroLevels=1`（abilities 多 requiredLevel 40+ 未解锁）+ `enemyTypes` 空（vulnerability 不匹配）。是测试简化，**不反映生产**。明斯克 l1 含外部加成偏差 ≈ -33.2（A1 后基线，见「变更」）。
- **生产口径**：owned level（满级 abilities 全 active）+ scenario enemyTypes（vulnerability 匹配）+ `computeActual*` globalBuff（add pool）。
- **obs 口径**：明斯克「顺势斩」单次攻击伤害（非 DPS），formationSize=1。同 level 722 偏差 dev≈-14.7（A1 后；calc 偏低主因是 baseDamage/BUD 未校准 + 未建模源）。

测试只断言**方向**（含外部加成/装备使 calc 变大 → 偏差往 0 收敛）与 formation-buff 结构正确性（聚合 > 0、入阵提升），**不**门控偏差绝对值——偏差经 `process.stdout` 记录作回归基线。

## 后果

- 正面：重构有客观回归线（偏差不退化、方向不反转），不被几十数量级噪声误导。
- 代价：绝对精度是 ongoing 工作（剩余大头见 `damage-mechanic-inventory.md` §5：装备 buff_upgrade/global_dps 大头、speed/cooldown 维度、药水/modron/favor），UI 须标「未校准」。
- 风险：新开发者误把测试偏差当 bug 修（本 ADR 钉死口径分离）。

## 替代方案

- **测试口径对齐生产**（owned level + enemyTypes + add pool）：不选——失去 singleSlot/level1 的最小可控回归隔离，且生产口径依赖私有 profile 不可进 CI。
- **放弃 golden 守护**：不选——重构无回归线，机制隔离等改动无安全网。

## 变更

- **2026-08-01 A1（同 key 跨源加法）落地**：修复前 ability global/hero 池与外部 globalBuff/heroDpsPool 同 key 相乘（`correctness-audit.md` §2），高估 carryDps 并与未建模源「负负得正」使偏差虚低。修复后外部加成注入 ability 池实现 IC 同 key 全源加法，carryDps 变小 → 偏差更负（l1 含加成 -32.7→-33.2、l722 -12.4→-14.7）。这是「停止负负得正」的预期表现，方向断言（含加成收敛）与 formation-buff CI 门控均仍通过，**无需重定位 golden**——偏差记录基线随之更新。

## 关联

- 依据：`research/data/planner/damage-reference-calibration.md`（obs 口径 / 测试简化 / 剩余大头）
- 落地：`references/damageReferenceVerification.test.ts`
- A1 修复路径：`research/data/planner/damage-bonus-sources.md` §7、`damage-mechanic-inventory.md`
- 绝对值校准：`research/data/planner/bud-calibration.md`（见 ADR 0012 BUD vs DPS）
