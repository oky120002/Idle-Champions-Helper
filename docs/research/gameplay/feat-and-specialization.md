# 专长（feat）与专精（specialization）

IC 两大英雄自定义系统，玩家选择带来 dps/金币/速度/生存加成，需接入阵型模拟器。

## 专长（feat）

**数据源**：`hero_feat_defines`（2517 条，公开 getdefinitions）+ `snapshot.active_feats`（per-user 已激活 feat id 列表）。

**机制**：每英雄 ~14 feat（中位数，max 24），玩家选 `feat_slots`（2-4，per-user，从 patron/favor/升级解锁）个激活。feat effect 多类，rarity 1-5（高 rarity 强）。相同 effect 的 feat 可叠加（同 pool add）。

**effect kind 分布**（按 calc dimension 归类）：
- **damage**：`buff_upgrade`(1136) + `global_dps_multiplier_mult`(430) + `buff_upgrades`(174) + `hero_dps_multiplier_mult`(138) + `effect_def`(42) + `buff_upgrade_per_any_tagged_crusader`(13) + `buff_upgrade_per_unique_race`(5) + `vicious_damage`(9) + `buff_base_crit_damage`(9) + `buff_base_crit_chance_add`(27) + `global_dps_multiplier_add`(1) + `favored_foe`(5)
- **gold**：`gold_multiplier_mult`(65)
- **speed**：`reduce_attack_cooldown`(7)
- **survival**：`health_mult`(78) + `taunt`(17)
- **utility**：`increase_ability_score`(151) + `add_hero_tags`(42) + `overwhelm_start_increase`(73)
- **unique**（英雄专属）：`krond_*`/`ellywick_*`/`mehen_*`/`minthara_*` 等 → semantic-overrides 单独 patch

**明斯克实例**：feat 35（旅店打手 `hero_dps +30%`）/ 38（无私 `global_dps +10%`）/ 399（力量之盔 `buff_upgrades,80,108-112` 偏好敌人 +80%）激活 `[35,38,399]`，feat_slots=3。

**现状**：calc **完全未接入** feat。hero-abilities.json signal source 全 `official-parsed`（无 feat 来源）。明斯克 feat 35/38/399 激活但未算。

## 专精（specialization）

**数据源**：champion-details upgrades 的 `specializationName`/`specializationGraphicId`（choice upgrade）。

**机制**：英雄升级中的 choice（选一个分支）。如明斯克「偏好敌人」（upgrade 108-112，reqLvl 50）选一个怪物类型。

**现状**：build 期把专精 upgrade effect 分流出 base（不再全 active），按 upgradeId 归一化进 `specialization-catalog.json`；runtime 按玩家选择（`OwnedHero.specializations`，来自 `userDetails.details.heroes[].specialization_choices`）注入对应 signal（ADR 0017）。vulnerability 类（`monster_with_tag_more_damage`）同样按玩家选择注入，再由 scenario enemyTypes 匹配生效。

## 设计

**共性抽象**：feat 和专精的 effect 都是标准 `effect_string`，**复用 `normalizeEffectSignal` + `signalSemantics`**——不新写匹配逻辑。区别只在「来源标记 + 生效条件」：
- feat：per-user（`snapshot.active_feats`），玩家已选 → 按 dimension 选 top。
- specialization：per-hero choice → 外部选择（build catalog，runtime 注入玩家实际选中 upgradeId，照 feat）。

**独特单独**：极少数独一无二机制（明斯克「直吹自擂」速度队核心等）走 semantic-overrides patch（现有机制）。

### feat 接入（按维度选 + 归一化叠加）

**数据管线归一化**（build 期 → hero-abilities.json `featCatalog`）：
- feat effect → signal（`normalizeEffectSignal` 复用）+ dimension 标记（effect kind → `HeroAbilityDimension`）。
- 每条 feat：`{ id, dimension, rarity, signal }`。
- 写 hero-abilities.json `featCatalog: Record<heroId, FeatEntry[]>`。

**运行时按维度选**（scoringMode → dimension → top feat）：
- `carry-dps` → damage dimension feat；`team-gold` → gold dimension feat。
- 按 `snapshot.feat_slots` 选 top N feat（按 rarity/收益排序，非全遍历——用户「技巧」）。
- 同 dimension feat 叠加（add pool，`applyHeroAbilityPatch` 注入 feat signal，source `'feat'`）。

**相同效果叠加**：同 dimension feat（如 `global_dps_multiplier_mult,10`+`,25`+`,50`）add pool 合并（`1+Σ/100`）。高 rarity + 低 rarity 一起用 → 对象数值更高（add 累加）。

**speed feat**（`reduce_attack_cooldown`）：calc 当前无 speed scoringMode（只有 `carry-dps`/`team-gold`），留后续（需 speed 评估维度）。

### specialization 外部选择

build 期 `collectRawEffectEntries` 按 `specializationName != null` 把专精 upgrade effect 分流到 `specializationEntries`（与 base 同源 `buildEffectEntry`，逐字等价）并剔除出 base；`specialization-catalog.ts` 按 upgradeId 归一化 → `specialization-catalog.json`（`{catalog: Record<heroId, SpecializationEntry[]>, updatedAt}`）。runtime `applySpecializationsToProfile` 注入玩家选中 upgradeId 的全部 scoring signal（不做 scoringMode 维度过滤——否则漏 vulnerability 维度）。与 feat 不同：feat 按 scoringMode 取 damage/gold 维度；专精是全局互斥选择，不过滤。

**已知下界偏差**（约束「不动 buff_upgrade 展开」所致，均低估非过冲）：ability/loot/feat 源 buff_upgrade wrapper 增益专精时，派生信号随专精一起离开 base（chosen 专精损失 wrapper 增益，如明斯克偏好敌人 +300 保留、+25 wrapper 丢失）；专精自身效果为复杂 wrapper（`buff_upgrade_mult_by_distance` 等，需展开）的约 4 英雄 catalog 原始解析不出 → 省略。详见 ADR 0017。

## 实现状态

1. ✅ vulnerability（`monster_with_tag_more_damage`，偏好敌人基础）经专精外部化按玩家选择注入（见 item 5）。
2. ✅ **feat 接入**（commit 95ed508c 数据管线 + dd7ef095 运行时）：
   - 数据管线：`scripts/data/feat-catalog.ts` 归一化 hero_feat_defines → `public/data/v1/feat-catalog.json`（signal + dimension）。
   - 运行时：`src/domain/abilities/featSignals.ts`（selectFeatSignals + applyFeatsToProfile）+ engine `applyActiveFeats`（按 scoringMode 维度 carry-dps→damage / team-gold→gold，注入 OwnedHero.active feats）。明斯克 feat 35（hero_dps +30%）+ 38（global_dps +10%）生效。
3. ⏳ **wrapper feat**（`buff_upgrades` 增强某 ability，如明斯克 feat 399 偏好敌人 +80%）：无 scoring dimension，留后续单独处理（解析 wrapper target + 增强 ability signal）。
4. ⏳ **calc 选 top feat**（当前用玩家 active feats；用户要的「全遍历选最优搭配」是推荐 top 模式，需 beam search 扩展 feat 组合）。
5. ✅ **specialization 外部选择**（ADR 0017）：build `specialization-catalog.json`（`collectRawEffectEntries` 分流专精 effect + `specialization-catalog.ts` 归一化）+ runtime `applySpecializationsToProfile` 注入 `OwnedHero.specializations` 选中项。专精从 base 剔除（不再全 active），含 vulnerability 类。下界偏差见上「specialization 外部选择」段。
