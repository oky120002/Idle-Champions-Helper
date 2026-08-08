# 药水（Potions）

**数据快照**：2026-08-08（effect-reference.json 58 条药水定义）
**社区来源**：[Fandom Wiki: Potions](https://idlechampions.fandom.com/wiki/Potions)、[CNE 官方：炼药台公告](https://codenameentertainment.com/?page=idle_champions&post_id=1776)、[Reddit：药水叠加讨论](https://www.reddit.com/r/idlechampions/comments/gzsg9u/multiple_potions_at_once/)
**可信度**：✅ 已确认 — 种类/效果/持续时间/字段由游戏数据直证；叠加规则由社区多帖交叉确认，火龙息跨稀有度叠加存在矛盾陈述（⚠️ 标注）

## 机制

药水是开启宝箱获得的限时增益消耗品，分六大家族，每家有四个稀有度档位（Small → Medium → Large → Huge），外加炼药台（Apothecary）产出的传奇档。全部定义在 `effect-reference.json` 中，用 `tags` 数组标记族别。✅

### 六大家族

| 家族 | 效果 | 小 | 中 | 大 | 超大 | 持续 |
|---|---|---|---|---|---|---|
| 巨人之力（Giant's Strength） | 全队伤害 +N% | 100% | 300% | 500% | 900% | 5 分钟 / 15 分钟 / 1 小时 / 直到重置 |
| 洞察（Clairvoyance） | 金币掉落 +N% | 100% | 200% | 300% | 400% | 同上 |
| 火龙息（Fire Breath） | 每次点击造成 N 秒 BUD 伤害 | 60s | 150s | 300s | 600s | 同上 |
| 英雄主义（Heroism） | 全队血量 +N% | 50 | 100 | 200 | 300 | 同上 |
| 速度（Speed） | 游戏速度 ×N | 1.25 | 1.75 | 2.25 | 2.75 | 同上 |
| 过期火龙息（Expired Fire Breath） | 每次点击造成怪物最大血量 N% | 1% | 2% | 4% | 8% | 1-8 分钟 |

"直到重置"（Huge）在数据中为 `duration: 315360000`（约 10 年），实际含义为冒险重置前持续有效。✅

### 传奇药水（Legendary）✅

2025 年炼药台系统引入，仅能通过炼药台用药剂试剂（Potion Reagents）和传奇瓶（Legendary Vessels）酿造。基础效果远超 Huge 档，持续 24 小时且跨冒险重置保留（`keep_on_reset: true`）。每瓶传奇药水额外提供「全药水效果 +15%」乘法增益，五瓶齐开约等于全药水效果翻倍。

| 药水 | 基础效果 | 全药水加成 | 持续 |
|---|---|---|---|
| 传奇巨人之力 | 伤害 +1500% | +15% 乘法叠加 | 24 小时 |
| 传奇洞察 | 金币 +500% | +15% | 24 小时 |
| 传奇英雄主义 | 血量 +400% | +15% | 24 小时 |
| 传奇火龙息 | 点击造成 900 秒 BUD | +15% | 24 小时 |
| 传奇速度 | 速度 ×3.25 | +15%，额外速度上限 +5%/瓶（加法，上限 +25%）| 24 小时 |

### 叠加规则 ⚠️

- **同类型同稀有度**：只延长持续时间，效果不叠加（如用两瓶 Small 巨人之力 = 10 分钟而非 +200%）✅
- **同类型不同稀有度**：效果乘法叠加（Small +100% × Medium +300% = ×8 总伤害）✅
- **火龙息例外**：社区存在矛盾陈述——部分帖子称火龙息完全不跨稀有度叠加（只取最高），另一部分称不同大小的火龙息可以叠加。倾向于不叠加，但无法从数据确认 ⚠️
- **不同类型**：各自独立生效，无冲突 ✅
- **Huge 档限制**：每种 Huge 药水同时只能激活一瓶，重复使用仅延长时间 ✅
- **传奇「全药水 +15%」**：乘法叠加，每瓶独立计算 ✅

### 与 BUD 的关系 ✅

火龙息药水的伤害公式为：点击伤害 = BUD × N 秒。BUD 升降时点击伤害实时跟随，无需重新使用药水。详见 [`bud-mechanics.md`](./bud-mechanics.md)。

### 英雄联动 ✅

BBEG（英雄 125）拥有唯一一个直接统计活跃药水数量的能力：每瓶活跃药水为 INT ≤ 12 的英雄提供额外伤害加成，乘法叠加（`stackFunc: per_active_potion`）。

### 变体限制 ✅

部分变体禁止使用火龙息药水和点击伤害（通常在 50/75/100 层后失效），数据中通过变体描述文本体现，无结构化字段。

## 数据源

| 字段/效果 | 位置 | 说明 |
|---|---|---|
| `tags: ["potion"]` | `effect-reference.json` | 药水统一标签，共 58 条 |
| `effect.key` | `effect-reference.json` | 效果类型：`global_dps_multiplier_mult` / `gold_multiplier_mult` / `click_damage_seconds_global_dps` / `health_mult` / `time_scale` 等 |
| `effect.args[0]` | `effect-reference.json` | 效果参数（百分比/秒数/倍率） |
| `rarity` | `effect-reference.json` | 1=Small, 2=Medium, 3=Large, 4=Huge, 5=Legendary |
| `duration` | `effect-reference.json` | 持续时间（秒）；315360000 = 直到重置；86400 = 24 小时 |
| `properties.keep_on_reset` | `effect-reference.json` | 跨冒险重置保留（传奇药水 = true） |
| `properties.override_base_effect_key/amount` | `effect-reference.json` | 传奇药水基础效果定义 |
| `properties.affected_by_speed_potion` | `effect-reference.json` | 是否受速度药水加速影响（过期火龙息 = true） |
| `tags: ["legacy"]` | `effect-reference.json` | 过期火龙息标记，当前已停产 |
| `tags: ["weekly_potion"]` | `effect-reference.json` | 每周药水（7 天持续，含 Modron/宝石/Boss 加成等特殊效果） |
| `per_active_potion`（stackFunc） | `hero-abilities.json`（BBEG / 英雄 125） | 每活跃药水叠加一次伤害加成 |
| `potion_reagents`（reward type） | `game-rules.json` | 炼药台试剂奖励 |

## 社区来源

- [Fandom Wiki: Potions](https://idle-champions.fandom.com/wiki/Potions) — 全药水种类/效果/稀有度对照表
- [CNE 官方：Apothecary 公告](https://codenameentertainment.com/?page=idle_champions&post_id=1776) — 传奇药水/炼药台一手来源
- [Reddit: Multiple Potions at once](https://www.reddit.com/r/idlechampions/comments/gzsg9u/multiple_potions_at_once/) — 叠加规则社区解释
- [Reddit: Epic potions stack?](https://www.reddit.com/r/idlechampions/comments/8durb1/epic_potions_stackhow/) — Huge 档不叠加确认
- [Reddit: Maximising fire breath potion effect](https://www.reddit.com/r/idlechampions/comments/q747og/maximising_fire_breath_potion_effect/) — 火龙息与 BUD 关系
- [Steam: BUD / Firebreath potion question](https://steamcommunity.com/app/627690/discussions/0/4390400383726725443/) — 火龙息秒数 × BUD 公式确认
- [Steam: medium fire breath potion lowers dps?](https://steamcommunity.com/app/627690/discussions/0/1735462352473180129/) — 火龙息不改变 DPS 确认
