# 加成来源盘点与叠加语义

IC 伤害加成 effect key 的来源全盘点 + IC 叠加语义。核心原则见 `docs/specs/modules/planner/computation-constraints.md`「加成建模正确性原则」：精确优先——已建模来源按 IC 真实叠加语义算对（同 effect key 全来源加法），未建模明确标注「没算」；不接受负负得正。

## DPS 公式

```
carryDps = baseDamage × levelCurve × damagePool × critFactor × vulnFactor × globalBuff × heroDpsPool
```

| 因子 | 来源 | 装配处 |
|---|---|---|
| baseDamage × levelCurve | 英雄基础伤害 × 等级曲线 | computeCarryDps |
| damagePool | 英雄技能（ability）加成池（残余非 global/hero） | placementFit → poolAggregation |
| critFactor | 暴击 | computeCritFactor |
| vulnFactor | 易伤 | computeVulnerabilityFactor |
| globalBuff | patron + blessing 的 global_dps（unified damage:global 池） | scoringBonusInputs → combineGlobalBuffMultipliers |
| heroDpsPool | 装备 + 外部 effect_def 的 hero_dps（unified damage:hero 池） | steadyStateScoring |

池机制：同 `${dimension}:${scope}` 池内 addPercent 相加、multFactor 相乘，池间相乘。`globalBuff` / `heroDpsPool` 是 **unified 池**——ability 源与外部源同属一个 IC effect key，按 IC 语义同 key 全来源加法（`1 + Σ(all value)/100`），非「ability 池 × 外部池」相乘。`scoreFormation` 把外部加成注入 ability 池副本实现全源加法（详见 `docs/specs/modules/planner/simulator.md`）。

## 加成来源全盘点

### global_dps_multiplier_mult（全队伤害 +X%）

| 来源 | 数据出处 |
|---|---|
| 英雄技能 | hero-abilities.json（kind=globalDpsMultiplier） |
| patron perk | patron-perks.json + userdetails actual level |
| blessing | userdetails reset_upgrade（actual level） |
| modron（齿轮） | userdetails.modron_saves（未接入） |
| 成就 | 未接入 |

IC 语义：同 key 全部来源属同一 add pool = `1 + Σ(所有 value)/100`。

### hero_dps_multiplier_mult（特定英雄 / carry 伤害 +X%）

| 来源 | 数据出处 |
|---|---|
| 英雄技能 | hero-abilities.json（kind=heroDpsMultiplier） |
| 装备 | loot-catalog.json + userdetails owned loot |
| 外部 effect_def（patron / blessing 带 filter） | effect-definitions.json |

IC 语义：同 key 全部来源加法叠加（unified damage:hero 池）。

## 未建模来源（明确「没算」，非「算错」）

| 来源 | 说明 | 量级线索 |
|---|---|---|
| vulnerability 条件生效 | scenario.enemyTypes 含种族时易伤才生效；生产有、测试简化无 | 明斯克偏好兽类 +2.43e6% |
| modron（齿轮） | grid 加成未接入（actual 在 userdetails.modron_saves） | core +200% 边际小，grid 待估 |
| 成就 / 药水 / gem | 未接入（actual 在私有存档） | 待估 |
| feat wrapper（部分） | buff_upgrade 复杂变体未解析 | 待估 |
| legendary（传奇装备） | 未接入 | 待估 |

按核心原则，这些「没算」可接受（不是错误）。它们暴露为真实正向偏差（计算值低于真实值），再逐类评估补建。

## 劣后项

对特定**种族 / 年龄 / 性别 / 小队**的攻击加成（effect_def tag 限定、favored_foe 等）：条件性、实现复杂、收益边际。按用户决策**劣后——主体正确性收敛后再做**。当前姿态已对：`externalHeroDpsMult.ts` 对「带 filter 但未解析」的 effect_def **保守丢弃**（宁可不算，不要错算成无条件过度生效）。

## 度量局限

`damageReferenceVerification` 测试用 obs = 明斯克「顺势斩」单次攻击伤害、formationSize=1、level 1、enemyTypes 空——是测试简化，偏离生产（owned 满级 + scenario enemyTypes 含种族）。**obs 不能当绝对精度标尺**。真正判据是**逐来源对错**（池归属与叠加是否符合 IC 语义），而非对齐 obs 数值。详见 `damage-reference-calibration.md`。

## 未建模补建方向

按「价值 × 静态可建模性 × 成本」排序（详见 `damage-mechanic-inventory.md` §8 里程碑）：

- 装备 `buff_upgrade` / `global_dps` 大头（已接入 owned-aware wrapper 通道）
- speed / cooldown 维度（已解析未消费，速度队核心，需 BUD 精确建模）
- vulnerability 条件生效（生产 enemyTypes 含种族，数据已具备）
- 私有存档导入（药水 / modron / favor，需 userdetails 导入通道）

## 关联

- 叠加正确性原则：`docs/specs/modules/planner/computation-constraints.md`「加成建模正确性原则」
- 加成聚合实现：`docs/specs/modules/planner/simulator.md`
- 机制全貌：`damage-mechanic-inventory.md`
- 度量口径：`bud-calibration.md`、`damage-reference-calibration.md`
