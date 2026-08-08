# 专长（feat）与专精（specialization）

**数据快照**：2026-08-06（feat-catalog.json + specialization-catalog.json 更新日期）
**可信度**：✅ 已确认 — 游戏数据直证（feat-catalog.json + specialization-catalog.json），无社区依赖

IC 两大英雄自定义系统：玩家选择带来 dps/金币/速度/生存加成。本文记机制与数据源事实；接入合同与维度映射见 `docs/specs/modules/planner/mechanic-isolation.md`、`docs/specs/modules/planner/dps-mechanics.md`。

## 机制

### 专长（feat）

**机制**：每英雄 4-19 个 feat（中位数 12），玩家选 `feat_slots`（2-4，per-user，从 patron/favor/升级解锁）个激活。feat effect 多类，rarity 1-4（集中在 2-4：rarity 2=566、3=858、4=611）。相同 effect 的 feat 同 pool 加法叠加。

**effect kind 分布**（按 calc dimension 归类）：

- **damage**：`buff_upgrade`(1136) + `global_dps_multiplier_mult`(430) + `buff_upgrades`(174) + `hero_dps_multiplier_mult`(138) + `effect_def`(42) + `buff_upgrade_per_any_tagged_crusader`(13) + `buff_upgrade_per_unique_race`(5) + `vicious_damage`(9) + `buff_base_crit_damage`(9) + `buff_base_crit_chance_add`(27) + `global_dps_multiplier_add`(1) + `favored_foe`(5)
- **gold**：`gold_multiplier_mult`(65)
- **speed**：`reduce_attack_cooldown`(7)
- **survival**：`health_mult`(78) + `taunt`(17)
- **utility**：`increase_ability_score`(151) + `add_hero_tags`(42) + `overwhelm_start_increase`(73) + `change_upgrade_data`(51) + `change_base_attack`(12) + `add_mithral_hall_stacks`(12) + `change_hero_alignment_tag`(9) + `do_nothing`(11) + `immolation`(13) 等
- **unique**（英雄专属命名）：`krond_*`/`ellywick_*`/`mehen_*`/`minthara_*` 等 → semantic-overrides 单独 patch

**明斯克实例**：feat 35（旅店打手 `hero_dps +30%`）/ 38（无私 `global_dps +10%`）/ 399（力量之盔 `buff_upgrades,80,108-112` 偏好敌人 +80%）激活 `[35,38,399]`，feat_slots=3。

### 专精（specialization）

**机制**：英雄升级中的 choice。如明斯克「偏好敌人」（upgrade 108-112，reqLvl 50）选一个怪物类型，对应 vulnerability `monster_with_tag_more_damage,300,<tag>`。

## 数据源

### 专长（feat）

**数据源**：`hero_feat_defines`（2517 条，公开 getdefinitions）+ `userDetails.details.heroes[].active_feats`（per-user 已激活 feat id 列表）。

**接入事实**：

- `feat-catalog.json`（`updatedAt: 2026-08-06`）含 165 个英雄（正 ID）、2036 条 feat entry；每条结构 `{id, rarity, signals: [{dimension, bucket, signal}], buffWrappers}`，dimension 由 effect kind 映射（damage/gold/speed/survival/utility）。
- `hero-abilities.json` 不携带 feat signal（feat 与 base ability 分离）；运行时由 `src/domain/abilities/featSignals.ts` 按 `OwnedHero.activeFeats` + scoringMode 维度注入（carry-dps→damage / team-gold→gold）。明斯克 feat 35（hero_dps +30%）+ 38（global_dps +10%）随活跃 feat 生效。
- feat wrapper（`buff_upgrades` 增强某 ability，如明斯克 feat 399 偏好敌人 +80%）：通过 `FeatEntry.buffWrappers` 复用 equipment buff wrapper 通道接入，target kind 限 DPS/gold/crit/health；非该范围或复杂变体（递归元家族）不计入。
- `reduce_attack_cooldown` feat 已归一化但消费层 speed 维度未接入 scoring。

### 专精（specialization）

**数据源**：`upgrade_defines` 中带 `specialization_name` / `specialization_graphic_id` 的 choice upgrade（玩家选一个分支）。

**接入事实**：

- build 期 `collectRawEffectEntries` 按 `specializationName != null` 把专精 upgrade effect 分流出 base（不全 active），按 upgradeId 归一化进 `specialization-catalog.json`（`updatedAt: 2026-08-06`，48 个英雄、123 条专精 entry）。
- runtime `applySpecializationsToProfile` 注入 `OwnedHero.specializations` 选中 upgradeId 的全部 scoring signal（不过滤 scoringMode 维度——否则漏 vulnerability/damageReduction）。
- vulnerability 类（`monster_with_tag_more_damage`）随专精选择注入，由 scenario enemyTypes 匹配生效。
- wrapper 派生信号靶向专精时路由到 `specializationDerived`（按 target spec upgradeId，进 catalog），不进 base——runtime 随玩家选择注入（chosen 专精 = 自身 + 派生，如明斯克偏好敌人 +300+25=+325）。下界偏差：专精自身效果为复杂 wrapper（`buff_upgrade_mult_by_distance` 等需展开）的约 4 英雄 catalog 原始解析不出 → 省略。
- `cooldownReduction`(12) / `attackSpeedMult`(5) 已归一化但消费层 speed/cooldown 维度未接入 scoring。

详细接入合同、wrapper 派生与 active 过滤见 ADR 0017（专精外部选择）与 `docs/specs/modules/planner/mechanic-isolation.md`。

## 社区来源

本文为游戏数据直接分析，无社区来源。
