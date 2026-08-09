# 赞助者与祝福（两大 per-user 全局增益）

两大类全局增益属于每个用户独有，必须从用户数据获取（非阵型内 buff，游戏 UI 仅显示部分）：

- **赞助者（patron perk）**：用赞助者代币购买升级，升多少加多少。
- **祝福（blessing）**：用战役 favor 购买，永久生效。

> blessing 在 IC 内部名 `reset_upgrade`（reset=重置冒险攒 favor，upgrade=用 favor 买的永久升级=blessing）。搜 "blessing" 搜不到——定义在 `userdetails.defines.reset_upgrade_defines`，actual level 在 `userdetails.details.reset_upgrade_levels`。

## 赞助者（patron_perk）

**数据源**：raw `patron_perk_defines`（110 条，normalize 进 `patron-perks.json`）+ `userdetails.details.patron_perks`（已购 `{patron_perk_id, level}`）。

**结构**：5 个赞助者（Mirt 米尔特 / Vajra 跋折罗·萨法尔 / Strahd 斯特拉德 / Zariel 扎瑞尔 / Elminster 艾尔明斯特）× `type`：

| type | 语义 | 生效条件 |
|---|---|---|
| 1 | 本地增益 | 仅当前 instance 的 patron 生效（见下「赞助者机制」）|
| 2 | 全局增益 | 恒生效（选不选都生效） |

每赞助者两类各若干 tier，用该赞助者代币购买（`cost.base_cost` × `scaling`）。

### 赞助者机制（multi-instance）

IC 的赞助者系统通过 multi-instance 实现（多 game instance，每 instance 独立 patron + campaign）。当前 instance 的 patron **不在顶层 `details.current_patron_id`（=0，误导）**，而在 `game_instances[active_game_instance_id].current_patron_id`：

- `active_game_instance_id`：标识当前 instance。
- `game_instances[].current_patron_id`：该 instance 选的 patron（`0`=无 patron 自由玩 / `1-5`=patron）；`current_patron_tier` 为 patron 等级。
- 本地增益（patron_perk `type 1`）仅 active instance 的 patron 生效。

patron 限定**不在 `adventure_defines`**（全字段无 `patron_id`）—— patron 是 instance 选的，非 adventure 限定。所谓「变体地图」= multi-instance（每 instance 一个独立 patron game）。

**effect 载体**：
- 裸 `effect_string`（如 `global_dps_multiplier_mult,$replace`）：直接全局加成，`$replace` 按 currentLevel 替换 = `per_level × level`。
- `effect_def,<id>`：引用 `effect_defines[<id>]`，含 `filter_targets` tag 限定（如女性/守序/第 3 列/体质≥14）。

**effect_string 分布（110 perks）**：`global_dps_multiplier_mult,$replace` 21（无条件全局 DPS）/ `gold_multiplier_mult` 4 / `global_dps_multiplier_mult_area_tags` 3（场景 tag）/ `effect_def,<id>` ~80（tag 限定 hero_dps）/ 其他（health/monster 等）少量。

**量级**：21 条无条件 global_dps actual Σ=5470 → `1+5470/100 = ×55.7`（log10=1.75）。

## 祝福（blessing / reset_upgrade）

**数据源（⚠️ 在 userdetails，非 raw getdefinitions）**：
- 定义：`userdetails.defines.reset_upgrade_defines`（200 条）
- actual level：`userdetails.details.reset_upgrade_levels`（`id → level`）

> 公开 getdefinitions **无** `reset_upgrade_defines`（0 次）。定义与 actual levels 同源于私有 payload（`userDetails`），故 blessing catalog + levels 都进 `UserProfileSnapshot.blessings`（非像 patron-perks.json 提成 public json——blessing 定义无公开源、不可 CI 重建）。

**结构**：10 个 deity（`reset_currency_id` = deity favor id，见 `reset_currency_defines`：1=Torm 托姆、2=Chauntea 裳禔亚、3=Kelemvor 克兰沃、5=Jergal 耶各、20=Azuth 阿祖斯、22=Tiamat、36=The Red Knight 赤红骑士 等）× 20 blessing/树 × `tier_id`（层级 1/2/3...）。用该 deity 的 favor 购买。`campaign_defines` 映射 campaign → deity：campaign 1（Sword Coast）→ Torm、2（Tomb of Annihilation）→ Kelemvor、15（Dragon Heist）→ Helm、32（Tales of Champions）→ Red Knight 等。

**全局/地图**：
- 地图祝福（`type 1`）：仅 `reset_currency_id`（deity）= 当前 campaign deity 的生效。
- 全局祝福（`type 2`）：跨所有 campaign（如「双倍伤害 ×2 适用于所有战役」、Gem Hunter、Patron's Favor）。`effect_defines` id=2718「for each Global Blessing, stacking additively」是消费 `num_global_blessings` 计数的元 effect（属某英雄 ability，非 blessing 定义本身）。

**地图 blessing 的 campaign 匹配**：地图 blessing 按当前 campaign 的 deity（`reset_currency_id`）生效。instance 的 `formation_saves_v2_campaign_id` 是 **multi-instance 编码**：`patron × 600000 + base_campaign`（patron=0 时即 base_campaign）。解码 `base_campaign = id % 600000`（id ≥ 600000）或 `id`（id < 600000），再查 `campaign_defines[base_campaign].reset_currency_id` 得 deity。

> 编码 `patron × 600000 + base_campaign` 基于 2 数据点（patron 0/2, campaign 1）反推；600000 常量来源未确认，多 patron/campaign 组合待验证。

**effect 载体**：同 patron_perk（裸 `effect_string` + `effect_def,<id>` 引用）。

**effect_string 分布（200 blessings）**：`global_dps_multiplier_mult,$replace` 22（无条件全局 DPS；type1 地图 21 + type2 全局 1）/ `global_dps_multiplier_times_desc` 6 / `global_dps_mult_per_unique_race/class/alignment/loot_rarity/tagged_crusader_mult` 各 1（per 计数）/ `global_dps_multiplier_mult_area_tags` 2 / `effect_def,<id>` 142（tag 限定）/ `reduce_attack_cooldown` 4 / `bonus_favor_earned_from_reset` 4 / 其他（gold/ult/boss gems 等）少量。

**量级**：22 条无条件 global_dps actual Σ=26800 → `1+26800/100 = ×269`（log10=2.43，迄今最大 globalBuff 单项）。

## active instance 过滤量级

patron type1（本地）/ blessing type1（地图）仅 active instance 的 patron / deity 生效。`normalize` 提取 `snapshot.activeContext = { patronId, deity }`：active = `game_instances[game_instance_id===active_game_instance_id]`，patronId=`current_patron_id`，deity=`formation_saves_v2_campaign_id` 解码 base(`%600000`)→`campaign_defines[base].reset_currency_id`。

明斯克参照（active patron=2 / deity=1）：合并 globalBuff 全算上界 ×324（`1+(5470+26800)/100`）→ active 真实 ×86.7。

## effect_def 结构

`effect_defines` 公开（CI 可重建）。每 effect_def 的 `effect_keys[]` 含 `effect_string` + 三类限定：

- **`filter_targets[]`**（英雄属性限定）：`by_tags`（female/male/rogue|bard|wizard/evil/geneutral，`|` 为 OR）/ `hero_expr`（HasTag/GetStat 表达式）/ `stat_score`（属性≥X）/ `attack_type` / `has_neighbour_with_tag` / `by_seat` / `by_release_date`
- **`targets[]`**（阵型目标范围）：`all` / `by_tags` / `heroes`(hero_ids) / `slots`(slot_ids) / `col_num`
- **`tag`**（场景/英雄 tag）：outdoors/rime/lawful/...

> `filter_targets` 在 `effect_keys[]` 内（非 effect_def 顶层）；effect_def 顶层字段是 `effect_keys / description / requirements / properties`。

**量级**（blessing 142 + patron 72 effect_def 引用全命中 effect_defines）：
- DPS effect_keys 164（hero_dps 122 + global_dps 42）
- 含 `filter_targets` 的 effect_keys：blessing 29 + patron 35 = **64**（需 per-hero 匹配）；其余 `targets=all` 直接生效（无英雄限定）

global_dps effect_def 全部无属性 filter（全局生效）；带属性 filter 的全是 hero_dps（per-carry 条件生效）。

## 关联

- 已进 scoring（`scoringBonusInputs.ts` 消费 `computeActualBlessingGlobalBuff` 进 global_dps 池，`collectActiveBlessingEffects` 进 per-carry hero_dps 池；effect_def 解引用两通道 + type1 active 过滤 + 保守丢弃）：`docs/specs/modules/planner/mechanic-isolation.md` BonusProvider + `docs/specs/modules/planner/simulator.md` 加成聚合
- ADR 0015 active 过滤回归守护
