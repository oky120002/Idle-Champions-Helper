# 伤害参照校准（calc vs obs 真实偏差）

明斯克（hero_id=7）伤害参照（minsc7ReferenceData）的 calc vs 实测（obs）偏差校准研究。
驱动「让计算器变准」的优先级判断——避免在测试假象或非大头项上浪费。

## obs 口径（关键）

**obs 是明斯克「顺势斩」单次攻击伤害**（attacks.base.damage），**不是 DPS**：
- minsc-l1：level 1，被诅咒的农夫第 1 层，formationSize=**1**（明斯克单英雄，无 support），obs=1.25e45，cooldown 3.75s。
- minsc-l722：level 722，formationSize=1，obs=5.02e62。
- cursed-farmer-l726：明斯克+瓦罗 2 英雄。

> calc `scoreFormation.objectiveValue` 是 carryDps（baseDamage × levelCurve × 加成），与 obs 单次伤害口径近似（同 baseDamage 基数 × 加成）；不除 cooldown。

## 真实偏差（同 level 对齐）

明斯克 owned level=726（满级附近）。同 level 722 对比：
- calc=2.05e50，obs=5.02e62，**dev=-12.4**（log10，calc<obs）。
- 非测试假象——同 level 真实偏差。

damageReferenceVerification 的 singleSlot dev=-31.71（l1）/ -12.59（l722）是**测试简化**（见下），不反映生产。

## 大头定位（vulnerability 未建模 → 已接入）

明斯克 unsupportedSignals 含 `monster_with_tag_more_damage`（偏好敌人兽类等，effect `monster_with_tag_more_damage,300,<tag>`），build 期 `resolveVulnerabilitySignal` 漏接（只接 `increase_damage_against_monster_tag`）。calc vuln=1.00。

**接入**（commit 32ae5e72）：`resolveVulnerabilitySignal` 加 `monster_with_tag_more_damage`（tag 动态 args[1]，同构）。明斯克 enemyVulnerability +10（5×+300% + 5×+25%，monsterTags humanoid/beast/undead/fey/monstrosity），unsupportedSignals 21→16。

## calc 加成口径（已确认对，非大头）

明斯克 level 722 calc 加成 10^7.58 = damagePool 8468（自增益满级，signal value 200-500% hero_dps，requiredLevel 40-585）+ globalBuff 91（#9：patron active 25.7 + blessing active 66.34）+ heroDpsPool 49.2（equipment 28.2 + externalHeroDps 22，#9 hero_dps effect_def）。

- **baseDamage 真实 10^7**（非 damageReferenceVerification fixture 1.06e1——fixture 是测试占位）。
- #9（globalBuff/equipment/externalHeroDps）口径对。
- obs 加成推算 10^36（同 level 722）>> calc 10^7.58，差 10^28。

## damageReferenceVerification 测试简化（偏离生产）

damageReferenceVerification 的 -32.7 偏差基于两个简化，**不反映生产 calc**：
1. **singleSlot**（formationSize=1 无 support buff）+ heroLevels=1（level 1 门控，abilities 大部分 requiredLevel 40+ 未解锁）。
2. **globalBuff 用乘积** `aggregateGlobalBuffMultiplier`（Π(1+percent/100)=×500）而非 IC add pool（1+Σ/100=×23）——incomingBuffs 4 个个人 effect_def，乘积高估。

生产 usePlannerPageModel 用 owned level（满级 abilities 全 active）+ scenario enemyTypes（vulnerability 匹配）+ computeActual* globalBuff（add pool）。

## 剩余大头（10^28 同 level）

明斯克偏好敌人 +1.01e04%（×102，用户数据）vs calc +300%（×4 基础）。差含：
- **feat wrapper**（明斯克 feat 399 buff_upgrades 偏好敌人 +80% 未接）。
- **ability 升级 stacking**（monster_with_tag_more_damage,$replace per level，明斯克满级 +2.43e6%）。
- modron grid buff（明斯克 buffs=[]未激活）/ 成就 / 药水 / gem / legendary。

## 度量方法（临时脚本，跑完即删）

`buildUserProfileSnapshot`（tmp/private-user-data normalize）+ loadBuiltHero + scoreFormation，复现生产计算链（computeActualPatronPerkGlobalBuff/computeActualBlessingGlobalBuff + collectHeroDpsContributions + computeEquipmentAdjustmentByHero），carry lockedCarryHeroId='7' + scenario enemyTypes 匹配 vulnerability。owned level vs obs level（1/722）不可比，仅同 level 量级对比。
