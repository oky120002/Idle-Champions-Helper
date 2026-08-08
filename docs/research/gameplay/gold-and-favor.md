# 金币发现与神圣恩宠（Gold Find & Divine Favor）

**数据快照**：2026-08-08（165 英雄）
**社区来源**：[Fandom Wiki - Gold formulas](https://idlechampions.fandom.com/wiki/Gold_formulas)、[Fandom Wiki - Divine Favor](https://idlechampions.fandom.com/wiki/Divine_Favor)、[Fandom Wiki - Blessings](https://idlechampions.fandom.com/wiki/Blessings)、[Reddit r/idlechampions](https://www.reddit.com/r/idlechampions/comments/1god1yf/gold_farming_101_an_introduction/)、[Steam 讨论](https://steamcommunity.com/app/627690/discussions/0/1630790987579561612/)
**可信度**：⚠️ 待确认 — 金币掉落公式和恩宠计算公式来自社区逆向推导，`game-rules.json` 部分验证（`health_gold_ratio: 0.65`）但指数 0.304 等无直接字段

## 机制

### 机制

金币掉落基于怪物生命值，经指数变换得到基础值，再乘以全部金币发现加成。

| 环节 | 公式 | 适用场景 |
|---|---|---|
| 怪物生命值 | `10 × 2.031^(level-1)` | 大多数战役 |
| 怪物生命值 | `20 × 2.035^(level-1)` | 阿弗纳斯（Avernus） |
| 怪物生命值 | `10 × 1.85^(level-1)` | 活动与时间门 |
| 基础金币 | `health^0.65`（即 `health^health_gold_ratio`）| level < 42 |
| 基础金币 | `health^(2.8 × level^-0.4)` | 42 ≤ level ≤ 201 |
| 基础金币 | `health^0.332406` | level > 201 |

Boss 关基础生命值 ×1.9，大多数 boss 还有约 ×50 的额外倍率。

> **数据验证**：`public/data/v1/game-rules.json` 中 `health_gold_ratio: 0.65` 与 Wiki 低等级公式一致；`gold_multiplier_limit: 10000` 为金币乘数上限。

最终金币 = 基础金币 × 金币发现百分比（含恩宠加成、英雄加成、祝福加成、药水等全部乘性叠加）。

### 金币发现加成来源

金币发现（Gold Find）是乘性叠加的总乘数，来源包括：

1. **神圣恩宠**：每 1 点未花费恩宠 = +1% 金币发现（见下节）
2. **英雄能力**：19 名英雄拥有 `globalGoldMultiplier` 信号（见数据验证表）
3. **祝福（Blessings）**：用恩宠购买，部分祝福提供金币发现百分比
4. **药水**：金币发现药水临时提升百分比
5. **赏金契约（Bounty Contracts）**：使用时立即在当前关卡生成一波金币掉落

### 神圣恩宠系统

### 核心循环

金币 → 恩宠 → 金币发现 → 更多金币。形成正反馈循环，但递减回报使恩宠增长逐渐放缓。

### 恩宠获取公式

单次冒险结束时的恩宠获取量基于该次冒险累计金币：

| 战役类型 | 恩宠公式 |
|---|---|
| 大多数战役 | `(gold/5e4)^0.304` |
| 阿弗纳斯 | `(gold/5e4)^0.292` |
| 冰风谷 + 妖精荒野 | `(gold/5e4)^0.281` |
| 活动与时间门 | `(gold/5e4)^0.315` |

恩宠大约每 10 关翻一倍。

### 永久恩宠（9 种）

每種恩宠绑定一个战役和神系，**未花费的恩宠每点永久 +1% 金币发现**。

| 恩宠 | 神系 | 战役 |
|---|---|---|
| Torm's Favor | Torm | 剑湾大巡游（A Grand Tour of the Sword Coast）|
| Kelemvor's Favor | Kelemvor | 湮灭之墓（Tomb of Annihilation）|
| Helm's Favor | Helm | 深水城：龙金劫（Waterdeep: Dragon Heist）|
| Tiamat's Favor | Tiamat | 博德之门：坠入阿弗纳斯（Descent into Avernus）|
| Auril's Favor | Auril | 冰风谷：霜女诅咒（Rime of the Frostmaiden）|
| Corellon's Favor | Corellon | 妖精荒野（Wild Beyond the Witchlight）|
| Celestian's Favor | Celestian | Xaryxis 之光（Light of Xaryxis）|
| Fortune's Favor | Shemeshka | 命运之轮（Turn of Fortune's Wheel）|
| The Wizards Three Favor | 巫师三人 | 厄运前夜：维科（Vecna: Eve of Ruin）|

### 活动恩宠（20 种）

活动（Highharvestide、Liars' Night、Simril 等）和时间门给予临时恩宠，活动结束后按以下比率转换为永久恩宠：

- 活动转换：`加成 = 10% × log10(活动恩宠)`
- 时间门转换：`加成 = 2.5% × log10(Mystra 恩宠)`（活动速率的 1/4）
- 解锁 Wibbly Wobbly Timey Gatey 祝福后，时间门转换率 +50%

### 恩宠与祝福的取舍

花在祝福上的恩宠不再计入金币发现加成。社区经验法则：单次祝福花费不超过总恩宠的 1%（游戏会警告），整体不超过 10%。

### 金币发现英雄（数据验证）

以下 19 名英雄在 `hero-abilities.json` 中携带 `globalGoldMultiplier` 信号（`supportSignals` 或 `carrySignals`）：

| 英雄 | stackFunc | rawEffect | 加成机制 |
|---|---|---|---|
| Azaka | — | `gold_multiplier_mult,20` | 固定 +20% |
| K'thriss | `get_stat` | `gold_multiplier_mult,1` | 按属性加成 |
| Omin | — + `per_hero_attribute` | `gold_multiplier_mult,1` + `buff_upgrade` | 固定 + 属性升级 |
| Ishi | `per_hero_attribute` ×2 | `gold_multiplier_mult,100` | 按属性百分比 |
| Rust | — | `gold_multiplier_mult,400` | 固定 +400%（游戏最高单体金币加成） |
| Ellywick | ×3 | `gold_multiplier_mult,50` + `buff_upgrade` | 多源叠加 |
| Evandra | — | `gold_multiplier_mult,100` | 固定 +100% |
| Windfall | — | `gold_multiplier_mult,100` | 固定 +100% |
| Egbert | `egbert_atonement` | `gold_multiplier_mult,100` | 赎罪机制叠加 |
| Certainty Dran | `per_hero_level_past_softcap` | `gold_multiplier_mult,1` | 按软帽后等级 |
| Valentine | `per_positional_formation_ability` | `gold_multiplier_mult,100` | 按阵型位置能力 |
| Astarion | `per_hero_attribute` | `gold_multiplier_mult,1` | 按属性 |
| Eric | `per_hero_attribute` | `gold_multiplier_mult,20` | 按属性 |
| Penelope | — | `gold_multiplier_mult,1` | 固定 +1% |
| Dob | `adjacent_champions` | `gold_multiplier_mult,30` | 按相邻英雄 |
| Merilwen | `per_tagged_crusader_mult` | `gold_mult_per_tagged_crusader_mult,100` | 按标签英雄数 |
| Gazrick | `per_tagged_crusader_mult` | `gold_mult_per_tagged_crusader_mult,100` | 按标签英雄数 |
| Regis | `per_mithral_hall_stacks` | `gold_multiplier_mult,100` | 秘银厅叠加 |
| Mehen | `per_other_stack_count` | `gold_multiplier_mult,0` | 按其他叠加数 |

> Rust 另有 `per_gold_find_orders_of_magnitude` stackFunc 影响 DPS（每 10 倍金币发现 = +100% DPS），是金币发现与伤害联动的唯一案例。

### 赞助人 perk 对金币的影响

`patron-perks.json` 中 4 位赞助人共有 7 个金币相关 perk：

| 赞助人 | 层级 | 名称 | 效果 key |
|---|---|---|---|
| Mirt | T3 | Well of Spoils | `gold_multiplier_mult` |
| Mirt | T6 | Price of Inflation | `gold_multiplier_mult` |
| Mirt | T8 | High Interest Loan | `gold_multiplier_mult` |
| Vajra | T4 | Spoils of Victory | `gold_multiplier_mult` |
| Vajra | T7 | Golden Gifts | `gold_chest_doubling_chance`（金币宝箱翻倍概率） |
| Strahd | T7 | And Prosperous | `global_dps_mult_per_tagged_crusader_mult,...,gold`（按标签英雄同时加 DPS 和金币） |
| Zariel | T10 | The Golden Halls | `effect_def,1774`（引用 effect-definitions） |

## 数据源

| 事实 | 字段位置 |
|---|---|
| 英雄金币加成信号 | `hero-abilities.json → items[].supportSignals/carrySignals → kind: "globalGoldMultiplier"` |
| 金币乘数上限 | `game-rules.json → gold_multiplier_limit: 10000` |
| 生命值-金币转换比 | `game-rules.json → health_gold_ratio: 0.65` |
| 离线金币参数 | `game-rules.json → offline_gold_params → use_better_offline_gold: true` |
| 赞助人金币 perk | `patron-perks.json → perks[] → effects[].effectString: "gold_multiplier_mult"` |
| 金币宝箱翻倍 | `patron-perks.json → perks[] → effects[].effectString: "gold_chest_doubling_chance"` |
| DPS 随金币叠加 | `hero-abilities.json → Rust → stackFunc: "per_gold_find_orders_of_magnitude"` |

## 验证标注

- **Wiki 公式验证**：`health_gold_ratio: 0.65` 在 `game-rules.json` 中确认，与 Wiki `gold = health^0.65` 一致
- **恩宠指数**：Wiki 的 `(gold/5e4)^0.304` 等公式为社区逆向推导，游戏数据中未直接暴露恩宠计算公式
- **恩宠转换率**：`10% × log10(event_favor)` 为社区逆向，游戏数据中未直接暴露
- **英雄金币信号**：19 名英雄的 `globalGoldMultiplier` 信号从 `hero-abilities.json` 直接提取，`source: "official-parsed"` 表示已解析
- **金币农场策略**：社区共识是设置「金币队」（formation 2），在墙边用火焰呼吸药水击杀后切换金币队拾取，Reddit 多帖确认

## 社区来源

- [Fandom Wiki - Gold formulas](https://idlechampions.fandom.com/wiki/Gold_formulas)
- [Fandom Wiki - Divine Favor](https://idlechampions.fandom.com/wiki/Divine_Favor)
- [Fandom Wiki - Blessings](https://idlechampions.fandom.com/wiki/Blessings)
- [Reddit r/idlechampions — Gold Farming 101](https://www.reddit.com/r/idlechampions/comments/1god1yf/gold_farming_101_an_introduction/)
- [Steam 讨论](https://steamcommunity.com/app/627690/discussions/0/1630790987579561612/)
