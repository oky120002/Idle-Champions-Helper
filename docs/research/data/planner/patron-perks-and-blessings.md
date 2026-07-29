# 赞助者与祝福（两大 per-user 全局增益）

两大类全局增益属于每个用户独有，必须从用户数据获取（非阵型内 buff，游戏 UI 仅显示部分）：

- **赞助者（patron perk）**：用赞助者代币购买升级，升多少加多少。
- **祝福（blessing）**：用战役 favor 购买，永久生效。

> **2026-07-29 修正**：旧结论「blessing 数据死路（3 端点无）」**作废**。blessing 数据在 `userdetails`，但 IC 内部名叫 `reset_upgrade`（reset=重置冒险攒 favor，upgrade=用 favor 买的永久升级=blessing），搜 "blessing" 搜不到。定义在 `userdetails.defines.reset_upgrade_defines`，actual level 在 `userdetails.details.reset_upgrade_levels`。

## 赞助者（patron_perk）

**数据源**：raw `patron_perk_defines`（110 条，normalize 进 `patron-perks.json`）+ `userdetails.details.patron_perks`（44 个已购 `{patron_perk_id, level}`）。

**结构**：5 个赞助者（Mirt 米尔特 / Vajra 跋折罗·萨法尔 / Strahd 斯特拉德 / Zariel 扎瑞尔 / Elminster 艾尔明斯特）× `type`：

| type | 语义 | 生效条件 |
|---|---|---|
| 1 | 本地增益 | 仅当前 instance 的 patron 生效（见下「patron 选中机制」）|
| 2 | 全局增益 | 恒生效（选不选都生效） |

每赞助者两类各若干 tier，用该赞助者代币购买（`cost.base_cost` × `scaling`）。

### patron「选中」机制（multi-instance）

IC 用 multi-instance（多 game instance，每 instance 独立 patron + campaign）。当前 patron **不在顶层 `details.current_patron_id`（=0，误导）**，而在 `game_instances[active_game_instance_id].current_patron_id`：

- `active_game_instance_id`：标识当前 instance。
- `game_instances[].current_patron_id`：该 instance 选的 patron（`0`=无 patron 自由玩 / `1-5`=patron）；`current_patron_tier` 为 patron 等级。
- 本地增益（patron_perk `type 1`）仅 active instance 的 patron 生效。

patron 限定**不在 `adventure_defines`**（全字段无 `patron_id`，free play adventure 的 `restrictions_text`/`requirements` 不含 patron 条件）—— patron 是 instance 选的，非 adventure 限定。所谓「变体地图」= multi-instance（每 instance 一个独立 patron game）。

实测（明斯克账号）：3 个 instance，`active_game_instance_id=3`，instance 3 `current_patron_id=2`（Vajra/跋折罗），`current_adventure_id=30`（被诅咒的农夫 free play）—— 即明斯克参照对应的 game。instance 1/2 同 adventure 但 `patron=0`（自由玩，无 patron 本地增益）。

**effect 载体**：
- 裸 `effect_string`（如 `global_dps_multiplier_mult,$replace`）：直接全局加成，`$replace` 按 currentLevel 替换 = `per_level × level`。
- `effect_def,<id>`：引用 `effect_defines[<id>]`，含 `filter_targets` tag 限定（如女性/守序/第3列/体质≥14）。

**effect_string 分布（110 perks）**：`global_dps_multiplier_mult,$replace` 21（无条件全局 DPS）/ `gold_multiplier_mult` 4 / `global_dps_multiplier_mult_area_tags` 3（场景 tag）/ `effect_def,<id>` ~80（tag 限定 hero_dps）/ 其他（health/monster 等）少量。

**量级**：21 条无条件 global_dps actual Σ=5470 → `1+5470/100 = ×55.7`（log10=1.75）。

## 祝福（blessing / reset_upgrade）

**数据源（⚠️ 在 userdetails，非 raw getdefinitions）**：
- 定义：`userdetails.defines.reset_upgrade_defines`（200 条）
- actual level：`userdetails.details.reset_upgrade_levels`（142 个已购，`id → level`）

**结构**：10 个 deity（`reset_currency_id` = deity favor id，见 `reset_currency_defines`：1=Torm 托姆、2=Chauntea 裳禔亚、3=Kelemvor 克兰沃、5=Jergal 耶各、20=Azuth 阿祖斯、22=Tiamat、36=The Red Knight 赤红骑士 等）× 20 blessing/树 × `tier_id`（层级 1/2/3...）。用该 deity 的 favor 购买。`campaign_defines` 映射 campaign → deity：campaign 1（Sword Coast）→ Torm、2（Tomb of Annihilation）→ Kelemvor、15（Dragon Heist）→ Helm、32（Tales of Champions）→ Red Knight 等。

**全局/地图**：
- 地图祝福（`type 1`）：仅 `reset_currency_id`（deity）= 当前 campaign deity 的生效。
- 全局祝福（`type 2`）：跨所有 campaign（如「双倍伤害 ×2 适用于所有战役」、Gem Hunter、Patron's Favor）。`effect_defines` id=2718「for each Global Blessing, stacking additively」是消费 `num_global_blessings` 计数的元 effect（属某英雄 ability，非 blessing 定义本身）。

**地图 blessing 的 campaign 匹配**：地图 blessing 按当前 campaign 的 deity 生效。⚠️ instance 的 `formation_saves_v2_campaign_id` 编码（如 instance 3 = `1200001`）与 `campaign_defines.id`（1/2/15/32/18）不一致——疑 multi-instance 编码（base campaign + offset），接入时需解码到 base campaign 再查 deity（待理清）。

**effect 载体**：同 patron_perk（裸 `effect_string` + `effect_def,<id>` 引用）。

**effect_string 分布（200 blessings）**：`global_dps_multiplier_mult,$replace` 23（无条件全局 DPS）/ `global_dps_multiplier_times_desc` 6 / `global_dps_mult_per_unique_race/class/alignment/loot_rarity/tagged_crusader_mult` 各 1（per 计数）/ `global_dps_multiplier_mult_area_tags` 2 / `effect_def,<id>` 142（tag 限定）/ `reduce_attack_cooldown` 4 / `bonus_favor_earned_from_reset` 4 / 其他（gold/ult/boss gems 等）少量。

**量级**：23 条无条件 global_dps actual Σ=26800 → `1+26800/100 = ×269`（log10=2.43，迄今最大 globalBuff 单项）。

## 接入状态与路径

`global_dps_multiplier_mult`（patron 21 + blessing 23）同属 global DPS **add pool**：`globalBuffMultiplier = 1 + Σ(value)/100`，patron + blessing 合并 `1+(5470+26800)/100 = ×324`（非各自相乘）。

| 项 | 量级 | 状态 |
|---|---|---|
| patron global_dps（21）actual | ×55.7 | ✅ 已接入 UI（f581562f）|
| blessing global_dps（23）actual | ×269 | 待接入 |
| 装备 hero_dps（per-carry）| ×28.2 | ✅ 已接入（3849d295）|
| patron/blessing `effect_def` tag 限定 | 未估 | 未接入（明斯克符合的人类/巡林客/混乱善良等 tag）|
| `global_dps_mult_per_*` 计数 | 未估 | 未接入 |
| modron（effect 943「有 core +200%」）| ×3 | 未接入 |

**本地/全局区分缺口**：当前 patron actual 接入未区分 type 1（本地）/type 2（全局），全按 actual 算 → 含未选中赞助者的本地增益（高估）。精确化需按 `current_patron_id` 过滤 type 1。

**剩余 10^32 偏差大头**：`effect_def` tag 限定（142 blessing + ~80 patron perk）+ `global_dps_mult_per_*` 计数 + modron + 成就 + legendary 等，需逐类接入。
