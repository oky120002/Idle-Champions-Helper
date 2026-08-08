# 明斯克（hero_id=7）机制实测

- 数据快照日期：2026-07-28（被诅咒的农夫 - 自由游玩 第1层，赞助者跋折罗-萨法尔）
- 关联参照：`src/domain/planner/references/minsc7ReferenceData.ts`
- 数据缺口：外部加成（恩赐祝福/赞助者）未建模、英雄技能无等级解锁门控、瓦罗阵型等级用户忘记记录（见 varo159 同 formationId 快照）

## 角色定位

**明斯克是 carry（输出/支援/速度/猎手）。** 基础攻击「顺势斩」顺劈；杀招「直取双眼!」与布布同时高额顺劈。「偏好敌人:兽类」+「直吹自擂」是**速度标签的核心**——直吹自擂在非首领波次额外刷怪且始终是偏好对手，是组建速度阵型（根 README「根本目标」三队之一）的核心数据。

## 原话（用户描述）

- 基础攻击「顺势斩」：顺劈距离最近敌人附近的所有目标，3.75 秒冷却（含外部缩减；游戏数据基准 `cooldown: 4.5s`）。
- 杀招「直取双眼!」：明斯克和布布同时攻击造成高额顺劈，45 秒冷却（含外部缩减；游戏数据基准 `cooldown: 180s`，`damageModifier: 0.01875`）。
- 「偏好敌人:兽类」：兽类敌人成为偏好对手，队伍对其造成的伤害 +2.43e06%。
- 「直吹自擂」：非首领波次刷新时 33% 几率额外刷新 1 名敌人、10% 几率额外 2 名，这些敌人始终是明斯克的偏好对手。**速度标签核心技能。**
- 即将生效的外部加成（随等级稳定）：关注核心（克兰沃恩赐祝福 +400%）、普通种族（托姆恩赐祝福 +1,500%）、以身作则（扎瑞尔 +150%，疑似赐福）、铁胃（跋折罗·萨法尔 +150%，疑似赐福）、领导冲锋（托姆 -0.5s 基本攻击冷却）。
- 阵型中瓦罗的「战斗指南」额外使明斯克伤害 +2.03e15%。

## 游戏显示（基础攻击伤害）

| 快照 | 等级 | 顺势斩 | 直取双眼!（杀招） |
|------|------|--------|-------------------|
| 单人 | 1 | 1.25e45 | 未解锁 |
| 单人 | 722 | 5.02e62 | 5.89e66 |
| 明斯克+瓦罗阵型 | 726 | 8.69e78 | 1.39e85 |

## 机制分析

- 明斯克自身 signal 丰富（built hero-abilities.json：44 carry + 13 support + 5 unsupported），含 heroDpsMultiplier / globalDpsMultiplier 类自增益与全队 buff。
- 「偏好敌人:兽类」是 vulnerability 类（monsterTags: 野兽），仅当场景 enemyTypes 含野兽时计入——`evaluatePlacementFit` 按 monsterTags 条件匹配。
- 「直吹自擂」是刷怪/速度机制，**不直接进 DPS pool**（非伤害倍率），属速度队组建语义，当前评分不消费（speed 维度未接 ScoringMode，见 architecture.md 未接入能力）。
- 即将生效的 5 条外部加成是 blessing/patron 给的，**不在 hero-abilities.json**（那只有英雄自身技能 signal），是绝对伤害偏差的主因。

## 推导与偏差

- **绝对伤害偏差（`damageReferenceVerification` 度量，2026-07-28）**：
  - level 1：计算器 2.03e11 vs 实测 1.25e45，**log10 偏差 −33.8**（低 33.8 个数量级）。
  - level 722：计算器 6.23e46 vs 实测 5.02e62，**log10 偏差 −15.9**。
  - 根因：外部加成（blessing/patron）未建模（1 级实测 1.25e45 主要由它们撑起）+ 英雄技能无等级解锁门控（1 级也算全部 signal）。登记在 architecture.md「未接入能力」。
- **cost 曲线 ≠ 伤害曲线**：1→722 级顺势斩比值 = 5.02e62/1.25e45 ≈ 4.0e17，反推真实伤害增长率 ≈ **1.058**；而 built `costCurves['1']=1.12`，1.12^721 ≈ 3.4e35（高 18 个数量级）。即用金币 cost 曲线代理伤害曲线是上界近似（`baseDps.ts` 注释自承），真实伤害增长慢得多。注：比值含 722 级偏好敌人（若野兽在场）的额外加成，1.058 为近似。
- **阵型交叉 buff**：瓦罗战斗指南（前面两列 +2.03e15%）在 cursed-farmer 阵型对明斯克 active（明斯克在瓦罗前列），`damageReferenceVerification` 断言瓦罗入阵提升明斯克阵型聚合——交叉位置 buff 是现有 mock 阵型测不到的核心用例。

## 接入事实

- 等级解锁门控：build 烘 requiredLevel，评分按 heroLevels 过滤。
- 外部加成 blessing/patron：global_dps active 过滤 + effect_def filter_targets 接入。
- vulnerability `monster_with_tag_more_damage`（偏好敌人基础 +300%）经专精外部化按玩家选择注入。
- feat 专长：active feats 按 scoringMode 维度注入；明斯克 feat 35 hero_dps +30% / 38 global_dps +10% 生效。
- feat wrapper（feat 399 buff_upgrades 偏好敌人 +80%）+ ability 升级 stacking（+2.43e6%）：尚未接入（feat wrapper 通道待补）。
- BUD/baseDamage 校准：costCurves 1.12 上界 vs 真实 1.058。

## 度量校准（详见 damage-reference-calibration.md）

同 level 722 calc vs obs dev=**-12.4**（真实偏差，非测试假象）。damageReferenceVerification singleSlot -32.7 是测试简化（level 1 门控 + globalBuff 乘积 ×500）偏离生产。obs 是单次攻击伤害（非 DPS）+ formationSize=1（无 support）。10^28 剩余大头：feat wrapper + ability 升级 stacking + modron/成就。
