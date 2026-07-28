# Patron 特权与祝福数据核实

## blessings 数据源

**结论：blessings 当前不可做——planner 只做 patron-perks。**

证据链：

1. **definitions 无 blessing 效果定义**：top-level keys 全量枚举无 `blessing_defines`；`patron_defines` / `campaign_defines` 的 properties 不含 blessing 树。effect_defines 中仅 634/646 含 `luck_of_yondalla_blessing`（Yondalla 特例机制，非通用 patron blessings 系统）。
2. **raw user save 有 favor + blessings 计数**：`scripts/data/user-sync/userProfileNormalizer.ts` 的 `CampaignPayload` 读 `favor` / `blessings`，`normalizeCampaignDetails` 产出 `{campaignId, favor, blessings: Record<string,number>}`。
3. **但 `UserProfileSnapshot` 丢弃该数据**：`buildUserProfileSnapshot` 调 `normalizeCampaignDetails` 只为产 warning，favor/blessings 不进 snapshot 字段（`src/domain/user-profile/types.ts` 的 `UserProfileSnapshot` 无 favor/blessings）。

即便把 favor/blessings 计数接回 snapshot，**没有 blessing 效果定义**就无法知道每个 blessing_id 给多少 DPS/金币加成——blessing 树定义不在当前 definitions 快照（可能属游戏服务端或未抓取的独立端点）。

因此当前数据合同不足以计算 blessings；缺口是 blessing 树效果定义和进入 `UserProfileSnapshot` 的 campaign 数据。

**2026-07-28 三端点验证（确认死路）**：blessing 是 per-campaign deity 系统（Kelemvor/Torm，用 Divine Favor 购买，web 确认，与 patron perk 两套系统）。3 端点全无 blessing 拥有数据：(1) getcampaigndetails 的 campaign 结构只有 campaign_id/adventure_ids/reset_currency(=favor) 等，**无 blessings 字段**；(2) getuserdetails 全文仅 UI 字段 `main_ui_blessings_button_order`；(3) getdefinitions 无 blessing 树。**b01f33a1 的 `campaigns[].blessings` 通道接的是空数据**（normalize 读 raw 不存在的字段）。另：明斯克 incomingBuffs「以身作则」「铁胃」经 patron-perks.json 核实是 Zariel/Vajra **patron perk**（id=36/16），非 blessing。

**patron_perk actual level 可用**：userdetails.details.patron_perks（44 个 `{patron_perk_id, level}`），可替代当前满级理论值（actual Σ=5470 → ×55.7 vs 满级 ×127）。

---

## patron-perks effect 结构

**结论：数据源结构清晰，可解析。**

来源：`patron_perk_defines`（110 条，type 1/2 各 55——type 区分 perk 类别，effect 结构同构）。结构：

```jsonc
{
  "id": 1, "name": "Mirt's Mirth", "patron_id": 1, "tier_id": 1, "type": 1,
  "cost": { "base_cost": 5000, "scaling": 1.05 },
  "levels": 10,
  "effects": [
    { "effect_string": "global_dps_multiplier_mult,$replace", "per_level": 100 }
  ]
}
```

- `effect_string` + `per_level`（每级加成值）。
- `$replace` 语义：perk 效果按当前等级**替换**（非叠加），有效值 = `per_level × currentLevel`，`levels` 上限封顶。
- 两类载体：裸 effect_string（直接全局加成）；`effect_def,<id>` 引用（指向 `effect_defines[<id>]`，含 `effect_keys[]` 带 `filter_targets` tag 限定）。

### effect_string 分布（110 perks）

| effect_string | 数量 | 加成类型 |
|---|---|---|
| `global_dps_multiplier_mult,$replace` | 21 | 无条件全局 DPS（进 patronPerkMult pool） |
| `gold_multiplier_mult,$replace` | 2 | 全局金币 |
| `global_dps_multiplier_mult_area_tags,$replace,<tag>` | 3 | 场景 tag 条件全局 DPS（hellish 2 / underground 1） |
| `global_dps_multiplier_mult_per_ge_pair,$replace` | 1 | 条件全局 DPS（按 GE 对计数，未接入） |
| `global_dps_multiplier_mult_per_enemy,$replace` | 1 | 条件全局 DPS（按敌人数计数，未接入） |
| `global_dps_mult_per_tagged_crusader_mult,$replace,gold` | 1 | 条件全局 DPS（按 gold tag 英雄计数，未接入） |
| `effect_def,<id>`（453-460 / 609-613 / 828-833 等） | ~80 | tag 限定 hero_dps / healing / vulnerability 等 |
| `monster_health_reduce,$replace` / `health_mult,$replace` / `monster_with_tag_more_damage` 等 | 少量 | 非全局，按需评估 |

### 接入现状

- **全局 DPS 进 global pool**：`global_dps_multiplier_mult,$replace`（21 条）直接进 `patronPerkMult` pool（add 语义，value = per_level × maxLevels）；`global-buffs.json` 实际产出 21 signals（per-patron 4/5/6/4/2）。area_tags 条件版（3 条）和 per_ge_pair/per_enemy/per_tagged 计数版（3 条）当前未接入。
- **tag 限定 hero_dps**（effect_def 引用，~80 条）：数据可通过 `filter_targets` tag 匹配英雄；当前支持范围以生成的 signal 与 warning 为准。
- **perk 等级来源**：patron perks 已购等级属用户存档（类似 blessings 缺口）。`UserProfileSnapshot` 当前未暴露 patron perk levels，因此取**满级理论值**（per_level × levels）并标注「理论最大」，不代表玩家实际等级。

> perk 等级数据缺口：`UserProfileSnapshot` 未暴露 patron perk 已购等级（同 §11.1 blessings 缺口）。raw user save 是否含 perk levels 待确认；当前用满级理论值进 pool。

---
