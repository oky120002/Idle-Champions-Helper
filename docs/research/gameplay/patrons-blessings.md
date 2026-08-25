# 赞助者与祝福（Patrons & Blessings）

**数据快照**：2026-08-06（5 位赞助者 / 165 英雄 / patrons.json + patron-perks.json）
**可信度**：✅ 已确认——赞助者限制规则、perk 层级、区域加码均与游戏数据和社区来源双重吻合；祝福系统仅社区来源（游戏数据无 blessings.json），标 ⚠️。

**社区来源**：
- [Fandom Wiki: Patrons](https://idle-champions.fandom.com/wiki/Patrons)
- [Fandom Wiki: Blessings](https://idle-champions.fandom.com/wiki/Blessings)
- [Reddit Patrons 101 — Gaarawarr](https://www.reddit.com/r/idlechampions/comments/1ae6nqf/patrons_101_an_introduction/)
- [Patron Roster（社区数据挖掘）](https://emmotes.github.io/ic_spoilers/patron_roster.html)

## 机制

### 赞助者系统概览

赞助者是中后期进度系统。激活赞助者后，以额外限制重玩已完成变体和自由模式，换取赞助者货币和影响力。货币用于赞助者商店（宝箱、专长药水、时光门碎片、魔域组件箱等）；影响力用于购买赞助者祝福（Patron Perks，永久增益）。

### 五位赞助者及其限制

| 赞助者 | 限制规则 | 区域加码 | 最低目标 | 强制可用英雄 |
|---|---|---|---|---|
| 米尔特（Mirt, id=1） | 仅善良或邪恶阵营 | +100 | 250 | 无 |
| 跋折罗（Vajra, id=2） | 体质（CON）≥ 14 | +125 | 275 | 无 |
| 斯特拉德（Strahd, id=3） | 智力（INT）≥ 13 | +150 | 300 | Nahara(102)、Van Richten(177) |
| 扎瑞尔（Zariel, id=4） | 力量（STR）≥ 10 **且** 魅力（CHA）≥ 13 | +175 | 325 | Karlach(143) |
| 艾尔明斯特（Elminster, id=5） | 仅近 3 年内发布或重做的英雄 | +300 | 825 | Gale(147) |

- 「区域加码」叠加在变体原始通关层数要求之上；艾尔明斯特取 `max(原始+300, 825)`。
- 「强制可用英雄」绕过限制规则——赞助者自己的代表英雄无条件可用（`forceAllowedHeroIds`）；米尔特和跋折罗无此字段。
- 英雄总数 165，各赞助者可用数量：米尔特 118、跋折罗 113、斯特拉德 85、扎瑞尔 83、艾尔明斯特 73；仅 8 名英雄五位赞助者全通。

### 限制规则的数据结构

每位赞助者的 `eligibilityRules` 定义英雄筛选条件，类型分三种：
- **tags**（米尔特）：`requiredAnyTags: ["good", "evil"]`——英雄标签命中任一即通过。
- **stats**（跋折罗/斯特拉德/扎折尔）：按属性阈值筛选。`blockedWhen: "all"` 表示所有条件均满足才禁用（跋折罗/斯特拉德单条件）；`blockedWhen: "any"` 表示任一条件满足即禁用（扎瑞尔双条件，STR 和 CHA 都不达标才被排除）。
- **time_available_days**（艾尔明斯特）：`maxAgeDays: 1095`（365×3），英雄发布或重做时间超过 3 年则不可用。

### Perk 系统（赞助者祝福）

每位赞助者有 11 层 Perk，每层 2 条（`typeId` 1 和 2 各一条），共 22 条 × 5 位赞助者 = 110 条。每条 Perk 可升级多级（10-50 级），效果随等级线性增长。

**层级解锁**：后一层需累计购买足够 Perk 等级（`requiredPurchasedPerkCount`）才解锁。例如米尔特：第 2 层需 15 级、第 6 层需 240 级、第 11 层需 500 级。艾尔明斯特的解锁门槛最低（第 11 层仅需 330 级），反映其英雄池小、可用 Perk 总量少。

**效果类型**（`effects[].key`）：
- `global_dps_multiplier_mult`：全队 DPS 加成（最常见）
- `gold_multiplier_mult`：金币加成
- `health_mult`：生命值加成
- `effect_def`：复合效果（引用 effect_definition，含条件加成如特定种族/性别/区域标签）
- 功能型：`reduce_hero_level_cost`（升级费用减免）、`time_gate_chest_doubling_chance`（时光门宝箱翻倍）、`increase_patron_challenge_rewards`（挑战奖励提升）等

**本地 vs 全局**：部分 Perk 仅在对应赞助者激活时生效（本地），其余全局生效。社区说法称本地 Perk 加成远大于全局，可随时免费重置已花费的影响力来调整配置。

**费用**：用赞助者影响力购买；Perk 等级费用按 `baseCost × scaling^当前等级` 递增。基础费用从 5,000（第 1 层）到 3.4 万亿（第 11 层），缩放系数 1.009-3.7 不等（大部分集中在 1.0-1.5 区间）。

### 祝福系统（Blessings）⚠️ 仅社区来源

祝福是与赞助者 Perk **独立**的永久增益系统，用神恩（Divine Favor）购买。三位永久战役神祇各提供 4 层祝福：

| 神祇 | 战役 | 层数 | 代表效果 |
|---|---|---|---|
| 汤姆（Torm） | 剑湾 | 4 | 全阵营伤害 ×2、BOSS 掉落宝石 +1、开局额外事件代币 |
| 凯勒夫（Kelemvor） | 湮灭之墓 | 4 | 全阵营伤害 ×2、事件神恩获取 +25%、招募 Azaka |
| 海尔姆（Helm） | 深水城 | 4 | 全阵营伤害 ×2、人形敌人金币 +25、每史诗装备 +2% 伤害 |

祝福同样分层解锁（如汤姆第 2 层需 15 级祝福、第 3 层需 65 级）。花费的神恩不再计入金币寻获量加成，重置仅返还 99%。游戏数据中无 `blessings.json`，以上均来自 Wiki。

### 神恩花费取舍

赞助者 Perk 和祝福是两套并行系统，互不冲突：
- **影响力**只能通过完成赞助者变体获得，用于 Perk；花费不影响商店购买力（商店看总收入）。
- **神恩**通过战役重置获得，用于祝福；花费会降低金币发现加成（1:1 消耗）。
- 赞助者货币（`weeklyFreePlayCap: 5000`）每周一重置，来自自由模式（2 代币/层）和周挑战（最多 +5000），用于商店消费。

## 数据源

| 文件 | 关键字段 | 说明 |
|---|---|---|
| `public/data/v1/patrons.json` | `id`, `restrictionsText`, `eligibilityRules`, `minObjectiveLevel`, `defaultObjectiveBump`, `weeklyFreePlayCap`, `forceAllowedHeroIds` | 5 位赞助者定义；`eligibilityRules.type` 为 `tags`/`stats`/`time_available_days` |
| `public/data/v1/patron-perks.json` | `perks[]`, `tiers[]` | 110 条 Perk + 55 条层级解锁阈值；Perk 费用在 `cost.baseCost`/`cost.scaling`，效果在 `effects[].key`/`effects[].effectString` |
| `public/data/v1/hero-abilities.json` | `items[].eligiblePatronIds` | 每位英雄的可用赞助者 ID 列表（`"1"`-`"5"`），由限制规则预计算 |
| `src/rules/championFilter.ts:50-51` | `patronEligibility?.eligiblePatronIds` | 阵型编辑器筛选逻辑：按 `eligiblePatronIds` 过滤 |
| `src/rules/illustrationFilter.ts:79-80` | 同上 | 插图页赞助者筛选复用同一字段 |

**注意**：`eligiblePatronIds` 是数据管线预计算的结果，已包含 `forceAllowedHeroIds` 例外。代码中不重新评估 `eligibilityRules`，直接信任预计算值。

## 社区来源

- [Fandom Wiki: Patrons](https://idle-champions.fandom.com/wiki/Patrons) — 赞助者系统总览、限制、货币、商店
- [Fandom Wiki: Blessings](https://idle-champions.fandom.com/wiki/Blessings) — 三神祝福效果与费用（⚠️ 仅 Wiki，无游戏数据验证）
- [Reddit: Patrons 101 — Gaarawarr](https://www.reddit.com/r/idlechampions/comments/1ae6nqf/patrons_101_an_introduction/) — 解锁顺序、Perk 策略、周挑战流程
- [Patron Roster](https://emmotes.github.io/ic_spoilers/patron_roster.html) — 全英雄赞助者可用性交叉表
