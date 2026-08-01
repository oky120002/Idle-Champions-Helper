# 加成来源全盘点与叠加正确性（A1）

> **状态（2026-08-01）**：§3 核心 bug「同 key 跨源相乘」已按 §7 选项 A 修复落地——外部加成（patron/blessing global_dps、装备 + effect_def hero_dps）注入 ability 池实现 IC 同 key 全源加法（`steadyStateScoring.ts` scoreFormation）。下方 §1-§3 描述修复前状态，保留作问题溯源；§4 未建模源仍待 Phase B 逐类补建。
>
> 轮 1 正确性审计 §2 登记的「外部加成池分裂」深度调研。核心原则（用户决策）：**精确优先——已建模的来源必须算对，未建模的明确标注「没算」；不接受「负负得正」（一个高估 bug 抵消一个低估缺口）**。本文盘点所有伤害加成来源、各自的 IC 叠加语义与当前代码处理，给出修复路径供决策。A3（种族/年龄/性别/小队条件加成）并入本文，归为劣后。

## 1. DPS 公式现状（代码事实）

`src/domain/planner/steadyStateScoring.ts:318-323`：

```
carryDps = baseDamage × levelCurve × damagePool × critFactor × vulnFactor × globalBuff × heroDpsPool
```

| 因子 | 来源 | 装配处 |
|---|---|---|
| baseDamage × levelCurve | 英雄基础伤害 × 等级曲线 | computeCarryDps |
| damagePool | **英雄技能（ability）** 加成池 | placementFit → poolAggregation |
| critFactor | 暴击 | computeCritFactor（A2 已修，接 per-hero base crit） |
| vulnFactor | 易伤 | computeVulnerabilityFactor（已修累乘 bug，各源加法） |
| globalBuff | **patron + blessing** 的 global_dps | scoringBonusInputs → combineGlobalBuffMultipliers |
| heroDpsPool | **装备 + 外部 effect_def** 的 hero_dps | steadyStateScoring:317 |

池机制（`poolAggregation.ts`）：同 `${dimension}:${scope}` 池内 addPercent 相加、multFactor 相乘（**同池加法**），**池间相乘**。

## 2. 加成来源全盘点

### global_dps_multiplier_mult（全队伤害 +X%）

| 来源 | 数据出处 | 当前处理 | 状态 |
|---|---|---|---|
| 英雄技能 | hero-abilities.json（kind=globalDpsMultiplier） | 进 damagePool（damage:global 池） | 算了，但与外部源**相乘** ❌ |
| patron perk | patron-perks.json + userdetails actual level | 进 globalBuff（加法） | 算了 |
| blessing | userdetails reset_upgrade（actual level） | 进 globalBuff（加法） | 算了 |
| modron（齿轮） | 未接入 | — | **没算** |
| 成就 | 未接入 | — | **没算** |

IC 语义：同 key 全部来源属同一 add pool = `1 + Σ(所有 value)/100`。
当前代码：英雄技能在 damagePool、patron/blessing 在 globalBuff，公式 `damagePool × globalBuff` **相乘** → 同 key 跨源该加法却相乘 = **错误**。

### hero_dps_multiplier_mult（特定英雄/carry 伤害 +X%）

| 来源 | 数据出处 | 当前处理 | 状态 |
|---|---|---|---|
| 英雄技能 | hero-abilities.json（kind=heroDpsMultiplier） | 进 damagePool（damage:hero 池） | 算了，但与外部源**相乘** ❌ |
| 装备 | loot-catalog.json + userdetails owned loot | 进 heroDpsPool（加法） | 算了 |
| 外部 effect_def（patron/blessing 带 filter） | effect-definitions.json | 进 heroDpsPool（加法） | 算了 |

IC 语义：同 key 全部来源加法叠加。
当前：英雄技能在 damagePool、装备+外部在 heroDpsPool，`damagePool × heroDpsPool` **相乘** → **错误**。

> heroDpsPool **内部**（装备 + 外部 effect_def）加法合并是**对的**（`steadyStateScoring.ts:317` 注释自相矛盾点在此——它只对池内加法，未把 ability 源纳入同池）。

### 已正确的因子
crit（A2）、vulnerability（已修累乘）、baseDamage / levelCurve：口径对 ✓

## 3. 核心 bug：同 key 跨源相乘

两种 key 犯同一个错：**英雄技能源**（走 damagePool）与**外部源**（走 globalBuff / heroDpsPool）本是同一 effect key、IC 要求加法叠加，代码却让两个池相乘。

影响：当英雄技能源与外部源都非平凡时高估 carryDps。例（明斯克，前序度量）：`damagePool 483 × globalBuff 91 × heroDpsPool 49`——英雄技能的 global/hero dps 本应与外部源加法合并成更小的池，却相乘放大。

**「负负得正」机制**：这个高估（相乘）刚好部分抵消未建模源（§4）的低估。golden 测试（ADR 0015 回归守护，非精度标尺）掩盖了两者，让数值「看起来接近」。

## 4. 未建模来源（明确「没算」，非「算错」）

| 来源 | 说明 | 量级线索 |
|---|---|---|
| vulnerability 条件生效 | scenario.enemyTypes 含种族时易伤才生效；生产有、测试简化无 | 明斯克偏好兽类 +2.43e6%（前序推算） |
| modron（齿轮） | grid 加成未接入 | core +200% 边际小，grid 待估 |
| 成就 / 药水 / gem | 未接入 | 待估 |
| feat（专长） | feat-catalog 有数据，加成通道未全接 | 待估 |
| legendary（传奇装备） | 未接入 | 待估 |

按核心原则，这些「没算」**可接受**（不是错误）。修 bug 后它们会暴露为真实正向偏差（计算值低于真实值），再逐类评估是否补建。

## 5. 劣后项（A3 并入）

对特定**种族 / 年龄 / 性别 / 小队**的攻击加成（effect_def tag 限定、favored_foe 等）：条件性、实现复杂、收益边际。按用户决策 **劣后——主体正确性收敛后再做**。当前姿态已对：`externalHeroDpsMult.ts:50` 对「带 filter 但未解析」的 effect_def **保守丢弃**（宁可不算，不要错算成无条件过度生效），符合「精确优先」。

## 6. 度量尺子局限

`damageReferenceVerification` 测试用 obs = 明斯克「顺势斩」**单次攻击伤害**、formationSize=1、level 1、enemyTypes 空——是测试简化，偏离生产（owned 满级 + scenario enemyTypes 含种族）。**obs 不能当绝对精度标尺**。真正判据是**逐来源对错**（池归属与叠加是否符合 IC 语义），而非对齐 obs 数值。修 bug 会让 golden 偏差变负——这是「停止负负得正」的预期表现，不是回归。

## 7. 修复路径选项

**选项 A：仅修同 key 跨源相乘 → 加法** ✅ 已落地（2026-08-01）
- 把英雄技能源的 global_dps / hero_dps 从独立 damagePool 相乘，改为注入对应外部池的 addPercent（global_dps → globalBuff add pool、hero_dps → heroDpsPool add pool），实现同 key 全源加法。
- 落地实现：`scoreFormation` 把外部加成注入 ability 池**副本**（`mergePools` 同 key addPercent 相加、保留 multFactor）得 unified 池；formation-buff 投影不注入（约束②）。breakdown factors 从 unified 池提取：globalBuff = `damage:global` 池、heroDpsPool = `damage:hero` 池、damagePool = 残余（非 global/hero 的 damage 池，结构性 =1）。
- 效果：已建模来源变精确；整体偏差由「负负得正的接近」转为「纯低估」（未建模缺口显现）——明斯克参照偏差 l1 含加成 -32.7→-33.2（见 ADR 0015 变更）。
- 符合核心原则：已建模的全对，未建模的明确标注。
- 连带已处置：golden（ADR 0015）方向断言 + formation-buff CI 门控均仍通过（偏差记录基线随之更新，无需重定位）；simulator.md 公式 + steadyStateScoring.test.ts + breakdown.factors 契约已同步。
- D2 协同：✅ 已删死产物 global-buffs.json + 死管线 patron-perk-signals.ts（A1 Phase A Commit 2，2026-08-01；TODO `atd_7b9e1f4c2a` 收口）。

**选项 B：A + 同步补全未建模源**
- 在 A 基础上逐类补建模（vulnerability 条件 / modron / feat / legendary…）。
- 工作量大，每类需核定 amount 与生效条件；收敛后计算值才真正接近真实。vulnerability 条件生效可能 ROI 最高（生产 enemyTypes 含种族，数据已具备）。

**选项 C：维持现状**
- 不修，接受负负得正。违反核心原则，不推荐。

## 8. 决策结果（2026-08-01）

1. **选 A**（已落地，见 §7）：让已建模来源精确，停止负负得正；B 的未建模补建作 Phase B 后续专项（`damage-mechanic-inventory.md` §5 量级排序）。
2. **golden 测试（ADR 0015）**：维持「结构回归守护」定位，方向断言 + formation-buff CI 门控均通过，偏差记录基线随 A1 更新（l1 含加成 -32.7→-33.2），无需重定位。
3. **未建模源补建优先级**：按 `damage-mechanic-inventory.md` §5 量级——装备 `buff_upgrade`/`global_dps` 大头 + speed/cooldown 维度优先；vulnerability 条件生效（生产 enemyTypes 含种族）数据已具备但收益边际小于装备大头。

## 关联

- 原始登记：`docs/audits/correctness-audit.md` §2
- 子主题调研：`patron-perks-and-blessings.md`、`equipment-and-abilities.md`、`damage-reference-calibration.md`
- 度量口径：`bud-calibration.md`、`monster-and-area-scaling.md`
