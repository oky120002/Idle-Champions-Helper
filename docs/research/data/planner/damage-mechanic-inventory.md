# 加成机制全量盘点

> 从 `effect-reference.json` 的 **1020 个 effect key** 出发，按语义归纳所有加成机制类型、模式与来源（数据 + 文本互相印证：每个机制有 effect key 代码标识 + `descriptions.desc` 中英文权威描述）。配合 [damage-bonus-sources.md](./damage-bonus-sources.md) 使用：本文件是「机制全貌」，那份是「加成来源盘点与叠加语义」。

## 1. 总览

- effectKeys 共 **1020 条**，归为 12 个语义大类；**伤害加成是绝对主力**，内部再分 21 子类（§2，另数百个英雄/装备专属命名 key 挂在这些通用机制下，按 owner + paramNames 反查所属）。
- 大量 effect key 是英雄/装备专属命名（如 `hitch_daggers`、`storm_of_flame_damage_mult`），挂在下列通用机制下；本表列**通用机制 key**（带语义后缀、可跨英雄复用），并标每类 effect 总数（含专属命名）。

## 2. 伤害加成机制全表（21 子类，~431 条）

| # | 机制类型 | 代表 effect key | 数值·模式 | 数量 |
|---|---|---|---|---|
| 1 | 全队伤害·纯乘算 | `global_dps_multiplier_mult`/`_add`/`_reduce`/`static_global_dps_mult` | $amount% 全队乘算 | 16 |
| 2 | 全队伤害·计数叠层 per_X | `global_dps_multiplier_mult_per_enemy`/`_per_familiar`/`_per_dead_champion_additive`/`_per_hero_xp_additive` | $amount% × 计数器（敌人/魔宠/标签勇士/死亡/区域击杀/XP），部分带上限 | 12 |
| 3 | 全队伤害·标签/区域限定 | `global_dps_mult_by_tag_additive`/`_by_tag_mult`/`_per_tagged_crusader_mult`/`_per_unique_class_mult`/`_area_tags` | $amount% × 标签勇士数 / unique 去重计数 / 区域标签触发 | 11 |
| 4 | 单英雄伤害·直接乘算 | `hero_dps_multiplier_mult`/`_add`/`_reduce`/`_mult_plus_upgrade_bonus` | $amount% 对 $target 乘算 | 15 |
| 5 | 单英雄伤害·相邻/列位置 | `hero_dps_mult_per_col_ahead`/`_per_col_behind`/`_reduced_by_source_distance_mult`/`buff_upgrade_mult_by_distance_from_source` | $amount% × 列数 / 距离（每格衰减） | 8 |
| 6 | 单英雄伤害·标签计数 | `hero_dps_mult_by_tag_additive`/`_per_tagged_crusader_mult`/`_increased_by_tag_additive`/`_reduced_by_tag` | $amount% × 标签勇士数；双标签对冲变体 | 10 |
| 7 | 单英雄伤害·通用计数 per_X | `hero_dps_mult_per_briv_steelbones`/`_per_mark_of_ki`/`_per_sisaspia_spore_used`/`_per_zealot_stack` | $amount% × 英雄专属栈（钢骨/真气/孢子/狂热者/宿敌） | 8+ |
| 8 | 单英雄伤害·目标/crusader 计数 | `hero_dps_mult_per_crusader_mult`/`_per_crusader_where_mult`/`_per_target_crusader_prebonus_mult` | $amount% × 符合条件目标数（stat/tag 比较） | 6 |
| 9 | 单英雄伤害·条件触发 if_X | `hero_dps_multiplier_if_attack`/`_if_stat`/`_if_attack_cooldown`/`_if_target_tagged_mult`/`_if_no_temp_hp_mult` | 条件成立给 $amount%（stat/冷却/生命阈值/标记/屏幕怪物/战役位置） | 12 |
| 10 | 单英雄伤害·stat 属性转化 | `hero_dps_multiplier_inc_per_stat_modifier`/`_by_stat_diff`/`_increase_mult_attack_speed_diff` | 每点 stat 修正 / stat 差 / 攻速差 → DPS% | 7 |
| 11 | 单英雄伤害·临时血量代价（埃拉珑系） | `hero_dps_multiplier_from_temp_hp`/`health_for_global_dps_multiplier_mult`/`buff_eiralon_blood_magic_health_and_dps` | DPS↑ + 自身 %HP 损耗 / 临时 HP 注入，带上限 | 5 |
| 12 | 单英雄伤害·特定目标过滤 | `target_hero_dps_multiplier_mult`/`targets_with_tag_hero_dps_mult`/`attacking_monsters_hero_dps_mult`/`dist_from_center_hero_dps_mult_reduce` | 按 id / tag / 正在攻击的怪物 / 与中心距离 | 9 |
| 13 | 易伤（怪物受伤端） | `increase_monster_damage`/`_additive_pools`/`_multiplicative_pools`/`increase_damage_against_monster_tag`/`_if_favored_foe`/`_when_attacking`/`_when_damaged`/`_per_debuff_mult` | 怪物受伤放大；**additive_pools / multiplicative_pools 是不同池**；多条件触发 | 37 |
| 14 | 暴击伤害 | `buff_base_crit_damage`/`_add`/`_add_mult`/`_mult`/`global_buff_base_crit_damage` | 暴击伤害基线；add / **add_mult（加算堆叠乘算应用）** / mult | 18 |
| 15 | 大招（ultimate）伤害 | `buff_ultimate`/`buff_ultimate_per_target_tagged_mult`/`ultimate_damage_override`/`increase_monster_ultimate_damage` | ultimate damage；per_target 计数；override 覆盖 | 14 |
| 16 | 基本攻击 / 点击伤害 | `buff_base_attack`/`buff_attack_damage`/`next_attack_damage_multiplier`/`base_click_damage`/`hero_click_damage_percent`/`unique_hit_multiplier` | base attack / click；next_attack 单次触发；unique_hits 攻击次数乘子 | 35 |
| 17 | DPS 转移 / 接收 | `transfer_dps`/`receive_transfered_dps`/`use_highest_formation_dmg`/`return_source_dps_when_hit` | 按百分比转移 DPS 给接收方（**依赖循环风险**） | 5 |
| 18 | buff_upgrade 元机制 | `buff_upgrade`/`_add`/`_add_then_mult`/`_per_any_tagged_crusader_mult`/`_per_column_behind_source_mult`/`_effect_stacks_max_mult` | **放大另一 upgrade 的效果值**；可叠加 tag/distance/column/stacks_max/trigger 全过滤模式 | 48 |
| 19 | 装备 / 史诗 / 等级 DPS | `hero_epics_dps_mult`/`seat_hero_epics_dps_mult`/`full_equip_dps_mult`/`hero_level_dps_mult`/`golden_loot`/`shiny_loot` | 按装备品质数 / 史诗件数 / 等级阶差乘算 | 8 |
| 20 | 位置阵型技能元加成 / 复制 | `buff_incoming_formation_abilities`/`buff_outgoing_formation_abilities[_per_crusader]`/`buff_positional_formation_abilities[_per_crusader]`/`receive_all_formation_abilities[_for]`/`duplicate_target_formation_abilities`/`valentine_socialite`/`beadle_share_the_glory`/`invert_formation_ability_targets`/`apply_feats_positionally` | 放大/复制/反转他人位置阵型技能（`buff_upgrade` 同层元加成，对象换成阵型技能）；依赖运行时技能实例集，静态不可求值（8 英雄，§5E） | 12 |
| 21 | 伤害回声 / 镜像副本 | `create_echo`/`buff_amplification_amount`/`buff_resolution_chance`/`buff_resolution_amount`/`sentry_aerois_synergy`/`reya_echoes_of_zariel`/`mirror_image[_damage_increase/duration]` | 创造伤害副本/镜像分身；放大回声、决心触发；依赖动态触发与持续时长（哨兵/蕾雅/阿夫伦，§5E） | 11 |

## 3. 其它加成机制（简表）

| 类别 | 代表 key | 条数 | 说明 |
|---|---|---|---|
| 暴击几率 | `set_base_crit_chance`/`buff_base_crit_chance_add_mult`/`crit_chance_inc_dps` | 22 | 区别于暴击伤害；set 覆盖；A2 已接 per-hero base |
| 攻速 | `attack_speed_mult`/`base_attack_speed_mult`/`time_scale`/`base_attack_cooldown_override` | 17 | 攻击计时器；time_scale 全局游戏速度 |
| 冷却 | `reduce_attack_cooldown`/`reduce_ultimate_cooldown`/`ultimate_cooldown_override`/`cooldown_reduction` | 28 | 减/增冷却秒数；override 直接设定 |
| 血量/最大生命 | `health_mult`/`global_health_mult`/`increase_health_by_source_percent`/`temp_health_mult` | 24 | 最大生命 %；temp 临时生命 |
| 生存/减伤/复活 | `damage_reduction`/`grant_temporary_hp`/`limit_monster_damage_to_percent_of_max_hp`/`revive_with_health_effect` | 30 | 减伤（近战/远程/持续）；temp_hp；单次伤害上限；复活 |
| 治疗 | `heal`/`healing_add_mult`/`healing_mult`/`healed_by_others_reduction_mult` | 18 | 治疗量 %；按距离衰减；来源过滤 |
| 金币 | `gold_multiplier_mult`/`gold_mult_per_tagged_crusader_mult`/`increase_monster_gold`/`_if_favored_foe` | 28 | 掉落金币 %；per_tagged 计数；偏好对手触发 |
| 属性/能力值 | `increase_ability_score`/`increase_base_ability_score` | 3 | STR/DEX/CON/INT/WIS/CHA |
| 怪物速度/刷新/激怒 | `monster_speed_increase`/`decrease_monster_spawn_time_mult`/`monster_enrage_timer_reduce` | 18 | 敌人移动/刷新/激怒倒计时 |
| 经验/奖励/掉落 | `bonus_favor_earned_from_reset`/`bonus_modron_exp_mult`/`increase_boss_gems`/`chest_chance` | 35 | 神恩转化/宝石/任务/宝箱/装备品质 |
| 叠层/栈管理（元） | `increase_all_stack_counts`/`ceremorphosis_stacks_mult`/`prevent_upgrade_stack_reset`/`broadcast_stacks_trigger` | 35 | 共享叠层池（魔枢/秘银厅/心灵蛹变/埃罗伊斯协同）；改 max/消费/防重置 |
| 跨冒险持久状态 | `zorbu_lifelong_enemies`/`hero_dps_mult_percent_lifelong_enemies`/`lifelong_enemies_count_amount` | 3 | 佐布宿敌命中计数（跨冒险累计，存档依赖，单冒险快照不可得） |
| DPS/金币跨域权衡 | `paid_up_front_increase_dps`/`paid_up_front_gold_reduce` | 2 | 莫尔甘预付：DPS↑ + 金币↓，且 DPS 随金币收集动态再↑ |

## 4. 来源 × 建模状态

七大来源全扫描（数据 + 文本 + 代码三印证；建模状态 grep `src/domain/planner` + `src/domain/buffs` 确认）：

| 来源 | 已建模（主） | 未建模 / 部分建模 |
|---|---|---|
| 英雄技能（hero-abilities，164 英雄 / 9818 信号） | carry 5949 + support 2277 全接（globalDps×2026、heroDps carry×5934 + support×197、health、gold、crit、vulnerability、damageReduction）+ 20 baseCrit（A2）；信号数为 build 期实测（随数据更新） | unsupported 1592 无 parser（health_add×411、set_ultimate_attack×163、buff_ultimate×8 英雄技能源…，见 §5） |
| 专长（feat-catalog，756 feat） | 7 kind 全量注入、全建模（globalDps×430、heroDps×138、health×78、gold×65、crit×36） | attackSpeedMult×9 已解析未消费（speed 维度） |
| 专精（specialization-catalog，115 spec） | 11 kind 全量注入、全建模（heroDps×83、vulnerability×11、crit×12、health×4、gold×6、damageReduction×8；signal 带 upgradeId——loot 源 target spec 的 DPS/gold/crit/health kind 经 applyEquipmentBuffs owned 接入） | cooldownReduction×12、attackSpeedMult×5 未消费（speed 维度）；feat 源 target spec + vulnerability/damageReduction spec 的 loot wrapper 仍「没算」（c-feat + SUPPORTED 扩展，待续） |
| effect_def 模板（effect-definitions，552 key） | 全 dps、全建模（patron/blessing 运行时解引用：hero_dps×474 + global_dps×78） | — |
| patron 特权（patron-perks，110 perk） | global_dps×21（patronPerkGlobalBuff）；effect_def×72 部分（只取 global_dps/hero_dps） | gold×4、health×1、vulnerability×1、area_tags×3、count 变体×3 未建模 |
| 装备（loot-catalog，4044 item） | hero_dps×160 + global_dps×688 + health×104 + gold×12 + crit×8（equipmentMult，enchant `(1+enchant/250)` 缩放；global_dps/gold 为 global-scope placement-aware per-hero，health/crit 为 hero-scope per-carry）+ `buff_upgrade`×1824 owned-aware wrapper 通道（upgradeId 反查 base + bonusScaleOfSignal 注入，与 feat/专精同层） | `reduce_ultimate_cooldown`×608、`buff_ultimate`×272 非 DPS（冷却/大招）不接；复杂 buff_upgrade 变体（`buff_upgrade_effect_stacks_max_mult` 等，依赖 build 期 stack 元数据）runtime 不构造 |
| 药水 / buff（effect-reference.buffs，790） | — | **全量无消费通道**（actual 值在 userdetails 私有存档：event_buff×670、legend_loot×20、global_dps×10…） |

## 5. 未建模缺口清单（planner 真实缺口，决策依据）

**A. 已解析进模型但 scoring 不消费**（维度未接入，信号浪费）：
- `attackSpeedMult`（解析进 pool 22 信号：carry 7 + support 15；speed 维度 scoring 不请求，BUD 用静态 `baseAttackCooldown` `budCalculation.ts`）；另有少量变体 No parser（如贾拉索 hero 4 `attack_speed_mult` val=3.33，见 §5E）。
- `cooldownReduction`（~620 信号）：cooldown 维度 scoring 不请求；大招 uptime 只看 ni 布尔，不消费。
- 对应根 README「速度队缺口」——speed / cooldown 是已登记的未接入能力。

**B. HeroAbilityKind 曾定义但零产出（死代码，已清理）**：
- `patronPerkMult`（patron 走独立通道，零产出）、`heroGoldMultiplier`（无 `hero_gold_*` effect 映射）、`adjacentBuff`（0 个 `adjacent_*` effect）、`taggedChampionBuff`（0 个 `tag_*` effect）——四者均已从 `HeroAbilityKind` 类型、维度/pool 映射、resolver、运行时分支与测试全链路删除。

**C. 来源有加成 effect 但无 parser / 无消费通道**（按量级排序）：
- 装备：`buff_upgrade`×1824 **已接入 owned-aware wrapper 通道**：① `HeroAbilitySignal.upgradeId` build 期写入；② `collectEquipmentBuffsByHero`（loot-catalog + enchant 缩放，产 per-hero wrapper 元数据）；③ `applyEquipmentBuffsToProfile`（按 target upgradeId 反查 direct base，构造 bonusScaleOfSignal wrapper 注入 profile，与 feat/专精同层）；④ 只接 DPS/gold/crit/health target kind，非该范围/递归元家族/复杂变体（`buff_upgrade_effect_stacks_max_mult` 等）→ 没算。真数据 672 collected buff → 201 wrapper（heroDps 132/globalDps 50/gold 16/crit 2/health 1）；`reduce_ultimate_cooldown`×608、`buff_ultimate`×272 非 DPS（冷却/大招）不接。
- 英雄技能 unsupported：`health_add`×411（flat 血量）、`buff_ultimate`×280（大招）、`global_dps_area_tags`×1、`global_buff_base_crit_damage`×1。
- patron：`gold`×4、`health`×1、`vulnerability`×1、`area_tags`×3、count 变体×3。
- effect-reference buffs：全量 790 无消费通道（药水 / 契约 / 事件 buff，actual 在私有存档）。

**D. modron / gem / favor（机制 effect key 在 effectKeys，actual 值在私有存档）**：
- modron：`increase_all_modron_buffs` 等，actual 在 `userdetails.modron_saves`；`src/domain/simulator/modronInfo.ts` 只读 `max_ni_auto_reset_area`(=2500) 做 UI 建议，不消费 buff 值。
- favor（神恩）：`bonus_favor_earned_from_reset` 等；`user-profile/types.ts:56` 有 `favor` 字段但 `src/domain/planner + buffs + simulator` 零消费（**存了不用**）；神恩→DPS 公式在服务端黑箱。
- gem（宝石）：`increase_boss_gems` 等属奖励类，非阵型评估因子。

**E. 动态触发 / 跨冒险存档机制家族（5 类，静态评估不可消费）**：
- **位置阵型技能元加成 / 复制**（12 effect key、8 英雄）：放大、复制、反转他人的位置/阵型技能（formation ability = 相邻·列 buff 这类位置加成本身），是 `buff_upgrade`（放大 upgrade）的同层元加成，作用对象换成阵型技能。`buff_incoming_formation_abilities`（漆黑毒蛇 40）、`buff_outgoing_formation_abilities[_per_crusader]`、`buff_positional_formation_abilities[_per_crusader]`（索剌克 120、瑞文嘉德公爵 149、乌尔科莉亚 68）、`receive_all_formation_abilities[_for]`、`duplicate_target_formation_abilities`、`valentine_socialite`（瓦伦汀 103）、`beadle_share_the_glory`（比德尔 64）、`apply_feats_positionally`（德萝拉 139）、`invert_formation_ability_targets`（战争公爵 116）、`disable_hero_formation_abilities`。依赖运行时阵型技能实例集合，静态期无法求值。
- **伤害回声 / 镜像副本**（哨兵系 + 阿夫伦）：`create_echo` + `buff_amplification_amount`（放大）+ `buff_resolution_chance/amount`（决心）+ `sentry_aerois_synergy[_stacks/contribution]`（埃罗伊斯协同池，哨兵 52）；`reya_echoes_of_zariel`（蕾雅 86）；`mirror_image[_damage_increase/duration/preference]`（阿夫伦 51）。创造伤害副本/镜像分身，依赖动态触发与持续时长。
- **预付权衡**（莫尔甘 55）：`paid_up_front_increase_dps`（DPS↑，且每收集 10ⁿ 金币再↑）+ `paid_up_front_gold_reduce`（金币↓ negative）。DPS/金币跨域权衡，且依赖金币收集动态累计。
- **宿敌持久计数**（佐布 22）：`zorbu_lifelong_enemies`（跨冒险命中计数）+ `hero_dps_mult_percent_lifelong_enemies`（按宿敌总增益数加 DPS）+ `lifelong_enemies_count_amount`。依赖跨冒险持久状态（userdetails 存档），单冒险快照不可得。
- **加性/计数变体 No parser**（各 1 条，量小）：`hero_dps_multiplier_add`（卡兹琳 166）、`hero_dps_multiplier_reduce`（塔林 74）、`hero_dps_mult_per_briv_steelbones`（布里夫 58，按钢骨层数）——§2 #4/#7 列为代表 key 但 parser 实际只接 `mult` 主体变体，这些变体未接，ROI 低登记不补。

**量级判断**：speed/cooldown 维度已解析未消费是**最大真实缺口**；装备 `buff_upgrade` owned wrapper 通道已接（ability 源静态 buff_upgrade 与 base effect_string snapshot 双重计数风险见 `modeling-pitfalls.md`）；modron/favor/药水需先解决私有存档（userdetails）导入通道；§5E 五家族依赖动态触发/跨冒险存档，静态评估不可消费，登记不建模。

## 6. 高风险机制模式（对 planner 建模有结构性影响）

1. **三种堆叠语义并存**：`add` / `mult` / `add_mult`（加算堆叠、乘算应用）/ `additive_pools` / `multiplicative_pools`（独立加算池 / 独立乘算池）。`increase_monster_damage_additive_pools` 与 `_multiplicative_pools` 是不同池，混用出错——这正是池分裂问题的根源（见 `docs/specs/modules/planner/simulator.md` unified 池）。
2. **buff_upgrade 是元加成**（48 条）：作用对象是「另一 upgrade 的效果值」，可叠加所有过滤模式——任意 DPS effect 都可能被它二次放大。
3. **target 与 tag 双重含义**：`hero_dps_mult_per_tagged` 是 count-only（数标签勇士作自增益，target=null）；`targets_with_tag_hero_dps_mult` 是对标签目标加成；`buff_upgrade_by_tag_mult` 同时是 filter + count。raw 游戏描述是唯一判据。
4. **if_X 条件触发大量存在**（`hero_dps_multiplier_if_attack`/`_if_stat`/`_if_target_tagged_mult`/`when_attacking`/`if_favored_foe`…）：planner 守护逻辑的主要来源。
5. **位置/距离衰减**（`*_by_distance_from_source`/`*_per_column_behind_source`/`*_percent_from_party_range`）：需阵型几何信息才能算。
6. **DPS 转移**（`transfer_dps` + `receive_transfered_dps`）：接收方 DPS 依赖转移方，存在依赖循环风险。
7. **临时血量代价**（埃拉珑系）：DPS 加成与 HP 损耗绑定，跨「生存/输出」两域。
8. **易伤（怪物受伤端）vs DPS 加成（输出端）是两个独立维度**，相乘关系但池归属不同——`global_dps_multiplier_mult` 提升勇士 DPS（输出端），`increase_monster_damage` 提升怪物受伤（输入端），实现易混淆。
9. **override / set 直接覆盖基线**（`base_attack_cooldown_override`/`ultimate_damage_override`/`set_base_crit_chance`/`set_monster_health`）：非 buff，是替换基线值，建模应作基础值修正。
10. **broadcast / trigger 信号**（`broadcast_on_trigger`/`broadcast_stacks_trigger`/`expression_on_trigger`）：跨英雄信号传输，守护逻辑核心。
11. **位置阵型技能元加成 / 复制**（§2 #20，12 key）：放大/复制/反转他人位置阵型技能，是 `buff_upgrade` 的同层元加成，作用对象换成阵型技能实例——任意位置 buff 都可能被二次放大或复制；依赖运行时技能实例集，静态期无法求值。
12. **伤害回声 / 镜像副本**（§2 #21）：创造独立伤害副本（哨兵回声 / 阿夫伦镜像），副本再受 amplification/resolution 调整，跨「本体 + 副本」两层，且依赖动态触发与持续时长。

## 7. 待人工判定（描述空 / 语义模糊，建模高风险盲区）

以下 effect 无中文描述或公式不明，需人工对照原始数据判定（17 条高优先级）：

- `hero_dps_mult_by_upgrade_val`、`ultimate_damage_override`、`static_global_dps_mult`/`static_hero_dps_mult`（静态 vs mult 区别不明）
- 易伤变体公式不明：`increase_damage_against_monster_armor`/`_against_monster_hits`/`_monster_target_by_bud_mult`/`increase_monster_damage_if_debuffed`/`_if_favored_foe`/`decrease_monster_damage_percent_from_party_range`
- 基本攻击/血量公式不明：`base_attack_deal_bonus_damage`/`reduce_base_attack_cooldown_by_percent_action`/`temp_health_mult`/`area_transition_health_mult`/`heal_all_to_percent`
- 怪物强化公式不明：`increase_monster_stun_duration`/`increase_monster_speed_until_percent_to_party`/`increase_monster_effect_limit_max`
- 测试/未使用（应排除）：`test_upgrade_key`/`NOTUSEDPLZUSE`/`unused_pls_use` 等

## 8. 未建模缺口优先级（里程碑）

按「价值 × 静态可建模性 × 成本」排序，供一个一个机制验证接入（planner 核心是「传什么算什么」：signal 进 pool 才消费，未传入默认 1/空 map，每机制可独立加测试再接 scoring）：

| 里程碑 | 范围 | 价值 | 成本 / 前置 |
|---|---|---|---|
| **M0** | DPS 五通道 hero_dps/global_dps/health/gold/crit + `buff_upgrade` owned-aware wrapper | 主目标量载体 | 已完成 |
| **M1 速度队** | `attackSpeedMult` 22 + `cooldownReduction` 620 已解析未消费 | 高（速度队核心，根 README 已登记） | 高：需 BUD 精确建模（当前 BUD 用静态 `baseAttackCooldown`），cooldown/攻速进入秒级 DPS |
| **M2 私有存档导入** | 药水 790 + modron + favor + 佐布宿敌计数 | 高（`event_buff` 670 等账号级加成，actual 全在 userdetails） | 高：需 userdetails 存档导入通道 + zod schema（favor 字段存了不用，见 §5D） |
| **M3 survival health 精化** | `increase_health_by_source_percent` target=`other`（31 条） | 低（survival 是推图约束，不进 carryDps） | 低：data-blindspot A4 确认 `excludeSelf + any` 可行，救回 31 条 |
| **M4 登记不建模** | §5E 五家族 + hero_dps 位置限定符 6 类（tallest/middle_column/snowflake/slot_if_expr/active_campaign/other） | — | 依赖动态触发 / 跨冒险存档 / 运行时阵型实例集，静态评估不可消费；已有 unsupported note 追踪 |

## 关联

- 加成来源盘点与叠加语义：[damage-bonus-sources.md](./damage-bonus-sources.md)
- planner 加成原则：`docs/specs/modules/planner/architecture.md`「加成建模正确性原则」
- 信号 filter/tag/target/count 语义：memory `hero-signal-target-qualifier-semantics`
