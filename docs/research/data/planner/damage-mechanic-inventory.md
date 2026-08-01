# 加成机制全量盘点

> 从 `effect-reference.json` 的 **1020 个 effect key** 出发，按语义归纳所有加成机制类型、模式与来源（数据 + 文本互相印证：每个机制有 effect key 代码标识 + `descriptions.desc` 中英文权威描述）。配合 [damage-bonus-sources.md](./damage-bonus-sources.md) 使用：本文件是「机制全貌」，那份是「A1 叠加正确性问题与修复路径」。

## 1. 总览

- effectKeys 共 **1020 条**，归为 12 个语义大类；**伤害加成 ~431 条（~42%）**是绝对主力，内部再分 19 子类。
- 大量 effect key 是英雄/装备专属命名（如 `hitch_daggers`、`storm_of_flame_damage_mult`），挂在下列通用机制下；本表列**通用机制 key**（带语义后缀、可跨英雄复用），并标每类 effect 总数（含专属命名）。

## 2. 伤害加成机制全表（19 子类，~431 条）

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

## 4. 来源 × 建模状态

七大来源全扫描（数据 + 文本 + 代码三印证；建模状态 grep `src/domain/planner` + `src/domain/buffs` 确认）：

| 来源 | 已建模（主） | 未建模 / 部分建模 |
|---|---|---|
| 英雄技能（hero-abilities，164 英雄 / 10993 信号） | carry 6261 + support 4731 全接（globalDps×3207、heroDps×6057+609、health、gold、crit、vulnerability、damageReduction）+ 20 baseCrit（A2） | unsupported 1892 无 parser（health_add×411、buff_ultimate×280…，见 §5） |
| 专长（feat-catalog，756 feat） | 7 kind 全量注入、全建模（globalDps×430、heroDps×138、health×78、gold×65、crit×36） | attackSpeedMult×9 已解析未消费（speed 维度） |
| 专精（specialization-catalog，115 spec） | 11 kind 全量注入、全建模（heroDps×142、vulnerability×21、crit、health、gold、damageReduction） | cooldownReduction×12、attackSpeedMult×9 已解析未消费 |
| effect_def 模板（effect-definitions，552 key） | 全 dps、全建模（patron/blessing 运行时解引用：hero_dps×474 + global_dps×78） | — |
| patron 特权（patron-perks，110 perk） | global_dps×21（patronPerkGlobalBuff）；effect_def×72 部分（只取 global_dps/hero_dps） | gold×4、health×1、vulnerability×1、area_tags×3、count 变体×3 未建模 |
| 装备（loot-catalog，4044 item） | hero_dps×160 + global_dps×688（equipmentMult，enchant `(1+enchant/250)` 缩放；global_dps 跨英雄全队聚合进 globalBuff 通道） | **大头未接**：buff_upgrade×1824、reduce_ultimate_cooldown×608、buff_ultimate×272、health×104、gold×12、crit×8 |
| 药水 / buff（effect-reference.buffs，790） | — | **全量无消费通道**（actual 值在 userdetails 私有存档：event_buff×670、legend_loot×20、global_dps×10…） |

## 5. 未建模缺口清单（planner 真实缺口，决策依据）

**A. 已解析进模型但 scoring 不消费**（维度未接入，信号浪费）：
- `attackSpeedMult`（~50 信号）：speed 维度 scoring 不请求；BUD 用静态 `baseAttackCooldown`（`budCalculation.ts`），攻速加成不生效。
- `cooldownReduction`（~620 信号）：cooldown 维度 scoring 不请求；大招 uptime 只看 ni 布尔，不消费。
- 对应根 README「速度队缺口」——speed / cooldown 是已登记的后续目标。

**B. HeroAbilityKind 定义但零产出（死代码，可清理）**：
- `patronPerkMult`（patron 走独立通道，此 kind 零产出）、`heroGoldMultiplier`（无 `hero_gold_*` effect 映射）、`adjacentBuff`（0 个 `adjacent_*` effect）、`taggedChampionBuff`（0 个 `tag_*` effect）。

**C. 来源有加成 effect 但无 parser / 无消费通道**（按量级排序）：
- 装备：`buff_upgrade`×1824、`reduce_ultimate_cooldown`×608、`buff_ultimate`×272、`health_mult`×104、`gold`×12、`crit`×8——**装备加成大头未接**（equipmentMult 接 hero_dps+global_dps，余维度未接）。
- 英雄技能 unsupported：`health_add`×411（flat 血量）、`buff_ultimate`×280（大招）、`global_dps_area_tags`×1、`global_buff_base_crit_damage`×1。
- patron：`gold`×4、`health`×1、`vulnerability`×1、`area_tags`×3、count 变体×3。
- effect-reference buffs：全量 790 无消费通道（药水 / 契约 / 事件 buff，actual 在私有存档）。

**D. modron / gem / favor（机制 effect key 在 effectKeys，actual 值在私有存档）**：
- modron：`increase_all_modron_buffs` 等，actual 在 `userdetails.modron_saves`；`src/domain/simulator/modronInfo.ts` 只读 `max_ni_auto_reset_area`(=2500) 做 UI 建议，不消费 buff 值。
- favor（神恩）：`bonus_favor_earned_from_reset` 等；`user-profile/types.ts:56` 有 `favor` 字段但 `src/domain/planner + buffs + simulator` 零消费（**存了不用**）；神恩→DPS 公式在服务端黑箱。
- gem（宝石）：`increase_boss_gems` 等属奖励类，非阵型评分因子。

**量级判断**：装备 `buff_upgrade` 未建模与 speed/cooldown 维度未接入是**最大真实缺口**（global_dps×688 已接 B1-a）；modron/favor/药水需先解决私有存档（userdetails）导入通道。

## 6. 高风险机制模式（对 planner 建模有结构性影响）

1. **三种堆叠语义并存**：`add` / `mult` / `add_mult`（加算堆叠、乘算应用）/ `additive_pools` / `multiplicative_pools`（独立加算池 / 独立乘算池）。`increase_monster_damage_additive_pools` 与 `_multiplicative_pools` 是不同池，混用出错——这正是 [A1 池分裂](./damage-bonus-sources.md) §3 的根源。
2. **buff_upgrade 是元加成**（48 条）：作用对象是「另一 upgrade 的效果值」，可叠加所有过滤模式——任意 DPS effect 都可能被它二次放大。
3. **target 与 tag 双重含义**：`hero_dps_mult_per_tagged` 是 count-only（数标签勇士作自增益，target=null）；`targets_with_tag_hero_dps_mult` 是对标签目标加成；`buff_upgrade_by_tag_mult` 同时是 filter + count。raw 游戏描述是唯一判据。
4. **if_X 条件触发大量存在**（`hero_dps_multiplier_if_attack`/`_if_stat`/`_if_target_tagged_mult`/`when_attacking`/`if_favored_foe`…）：planner 守护逻辑的主要来源。
5. **位置/距离衰减**（`*_by_distance_from_source`/`*_per_column_behind_source`/`*_percent_from_party_range`）：需阵型几何信息才能算。
6. **DPS 转移**（`transfer_dps` + `receive_transfered_dps`）：接收方 DPS 依赖转移方，存在依赖循环风险。
7. **临时血量代价**（埃拉珑系）：DPS 加成与 HP 损耗绑定，跨「生存/输出」两域。
8. **易伤（怪物受伤端）vs DPS 加成（输出端）是两个独立维度**，相乘关系但池归属不同——`global_dps_multiplier_mult` 提升勇士 DPS（输出端），`increase_monster_damage` 提升怪物受伤（输入端），实现易混淆。
9. **override / set 直接覆盖基线**（`base_attack_cooldown_override`/`ultimate_damage_override`/`set_base_crit_chance`/`set_monster_health`）：非 buff，是替换基线值，建模应作基础值修正。
10. **broadcast / trigger 信号**（`broadcast_on_trigger`/`broadcast_stacks_trigger`/`expression_on_trigger`）：跨英雄信号传输，守护逻辑核心。

## 7. 待人工判定（描述空 / 语义模糊，建模高风险盲区）

以下 effect 无中文描述或公式不明，需人工对照原始数据判定（17 条高优先级）：

- `hero_dps_mult_by_upgrade_val`、`ultimate_damage_override`、`static_global_dps_mult`/`static_hero_dps_mult`（静态 vs mult 区别不明）
- 易伤变体公式不明：`increase_damage_against_monster_armor`/`_against_monster_hits`/`_monster_target_by_bud_mult`/`increase_monster_damage_if_debuffed`/`_if_favored_foe`/`decrease_monster_damage_percent_from_party_range`
- 基本攻击/血量公式不明：`base_attack_deal_bonus_damage`/`reduce_base_attack_cooldown_by_percent_action`/`temp_health_mult`/`area_transition_health_mult`/`heal_all_to_percent`
- 怪物强化公式不明：`increase_monster_stun_duration`/`increase_monster_speed_until_percent_to_party`/`increase_monster_effect_limit_max`
- 测试/未使用（应排除）：`test_upgrade_key`/`NOTUSEDPLZUSE`/`unused_pls_use` 等

另：约 350+ 英雄/装备专属命名 key（带英雄前缀如 `selise_*`/`mehen_*`），挂在上述通用机制下，建模时按 owner + paramNames 反查所属机制。

## 关联

- 叠加正确性与 A1 修复路径：[damage-bonus-sources.md](./damage-bonus-sources.md)
- planner 加成原则：`docs/specs/modules/planner/architecture.md`「加成建模正确性原则」
- 信号 filter/tag/target/count 语义：memory `hero-signal-target-qualifier-semantics`
