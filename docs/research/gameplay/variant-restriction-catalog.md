# 变体限制机制目录（variant restrictions）

**数据快照**：2026-08-06（`variants.json`，1424 个变体，128 种 mechanics 标记）
**社区来源**：[Fandom Wiki — Variants](https://idlechampions.fandom.com/wiki/Variants)、[Fandom Wiki — Patrons](https://idlechampions.fandom.com/wiki/Patrons)、[Reddit r/idlechampions — Patrons 101](https://www.reddit.com/r/idlechampions/comments/1ae6nqf/patrons_101_an_introduction/)、[Steam 讨论 — 限制型变体](https://steamcommunity.com/app/627690/discussions/0/1635292137567372667/)
**可信度**：✅ 已确认 — 计数和分类由 `jq` 对 `variants.json` 全集统计直证，社区来源仅作机制概念参考

## 机制

变体（variant）在基础冒险上叠加规则改写。限制来源有两层：变体自身规则 + 可选的赞助人（patron）全局限制，二者叠加生效。1424 个变体中，850 个带赞助人标记，364 个兼属自由游玩。

游戏数据通过 `mechanics` 数组（128 种标记）标注变体使用的底层机制，`restrictions` 数组存人类可读描述。限制效果集中在以下几类。

## 限制机制分类表

| 类别 | 机制说明 | 游戏数据表现 | 对 planner 的影响 |
|---|---|---|---|
| **阵型占位**（escort） | NPC 或物体占据阵型格，不可移除、通常不打伤害 | `slot_escort`(282)、`slot_escort_by_area`(38)、`slot_escort_wandering`(3)；`escortCount` 字段记基础占位数 | 占用格应从可用槽位扣除；`escortCount` 已入 schema 但 planner 未消费 |
| **英雄白名单** | 只允许特定英雄参战，按 id 或 tag 过滤 | `only_allow_crusaders`(501)；投影为 `allowedHeroIds`(13 非空) + `allowedTagExpression`(121 非空，DNF: OR of ANDs)；复合对齐标记（`lawful_good` 等）展开为对齐轴 AND（`lawful^good`） | planner 已建模：候选英雄按白名单过滤（`filterAndSortCandidateHeroes`），支持 `^`(AND)/`!`(取反)/`|`(OR) 复合表达式 |
| **属性门槛** | 按能力值（INT/CHA/STR/DEX/CON/WIS）筛选英雄，常见 ≥13 或 ≤14 | `restrictions` 文本描述；2026-08-08 结构化提取为 `attributeRequirements`（102 变体非空）；使用白名单提取——仅从含「can/may be used」「only use」「take part」的使用门槛语句提取，排除伤害修饰（deal）、伤害免疫（take no damage）、邻接位限制（placed adjacent）等条件效果句 | ✅ 已建模：restriction 文本正则解析 → `scenarios.json.attributeRequirements` → planner 候选过滤（`meetsAttributeRequirements`） |
| **角色限制** | 按 DPS/Support/Tank/Healing/Speed 角色过滤 | `allowedTagExpression` 含 `!dps`(4)、`!tanking`(2)、`!speed`(2)、`!healing`(1)；`disallow_crusaders`(17) | `!dps` 类已走 `allowedTagExpression` 通道；`disallow_crusaders` 部分未投影 |
| **强制英雄** | 指定英雄必须上场、不可移除 | `force_use_heroes`(329)；投影为 `forcedHeroIds` | planner 已建模：`forceInclude` 约束 + 候选豁免（`recommendationEngine.ts:501`） |
| **全局效果** | 全队持续增益或减益，如伤害倍率、攻速调整 | `global_effects`(296)；`restrictions` 文本描述 | 未建模；伤害/攻速调整需注入评估参数 |
| **槽位条件** | 按阵型位置生效的效果（相邻、列、行） | `slot_effects`(94)、`slot_effects_by_area`(7)、`restrict_allowed_slots`(2) | 未建模；需位置条件求值器 |
| **英雄特定效果** | 指定英雄获得 buff 或 debuff | `hero_effects`(42) | 未建模；需按英雄 id 注入信号 |
| **英雄受伤** | 随机或定时对英雄造成伤害 | `random_crusader_damage`(39)、`moving_effects`(6)、`stacking_effect`(5) | 未建模；属生存维度，影响 survival 评估 |
| **永久死亡** | 英雄阵亡后不可复活或永久离队 | `perma_death`(24)、`perma_unavailable`(12) | 未建模；影响生存策略权重 |
| **阵型锁定** | 放置后不可交换或移除 | `no_formation_removal_allowed`(22) | 未建模；影响推荐策略 |
| **去重限制** | 阵型中同类 tag 唯一（如仅一种族/职业/阵营） | `max_active_by_tags`(10)、`unique_stats`(2)、`max_active_affiliations`(1) | 未建模；属组合约束，需新增约束类型 |
| **总数限制** | 限制阵型上场英雄数量 | `limit_active_crusaders`(1) | 未建模；需动态调整可用槽位数 |
| **等级上限** | 英雄等级不可超过指定值 | `max_hero_level`(3) | 未建模；影响成长曲线 |
| **敌人强化** | 敌人获得额外属性（护甲、血量、伤害、速度） | `add_monster_properties`(39)、`add_monster_properties_by_tag`(56)、`add_monster_properties_by_id`(25) | 未建模；护甲敌人见 [armored-enemies.md](./armored-enemies.md) |
| **特殊敌人刷新** | 额外或保证出现的敌人波次 | `random_monster_waves`(246)、`guaranteed_monsters`(74)、`random_monster`(31)、`additional_bosses`(39) | 未建模；影响区域推进速度评估 |
| **金币调整** | 修改金币掉落倍率 | `gold_adjustment`(4)、`gold_adjustment_by_area`(2)、`gold_bonus_adjustment`(1)、`crusader_cost_power`(1) | 未建模；影响金币预算评估 |
| **点击/大招禁用** | 禁用点击伤害或大招 | `click_damage_area_limit`(33)、`disallow_ultimates`(1) | 未建模；点击伤害归零影响低区域推进 |
| **天气/视野** | 天气效果或视野限制 | `weather`(25)、`darken`(2)、`darken_by_area`(5) | 未建模；`darken` 系列叠加怪物血量增长 |
| **属性总分** | 按能力值总和过滤（奇/偶/阈值） | `restrictions` 文本描述 | 文本未解析；需能力值求和 + 奇偶判定 |

## 典型变体示例

| 类别 | 变体名 | 机制概述 |
|---|---|---|
| 占位 | Are Ya Chicken?（id:4） | 四格被小鸡占据 |
| 占位（递进） | Friend of Nature（id:18） | 每 50 区域多一只动物占位，最多 6 只 |
| 白名单（tag） | Cramped Quarters（id:42） | 仅矮人和小型种族（7 种 tag 的 OR） |
| 属性门槛（≥） | Pros and CONs（id:100） | 仅 CON ≥ 13 的英雄可用 |
| 属性门槛（≤） | Not Very Charming（id:130） | 仅 CHA ≤ 14 的英雄可用 |
| 属性总分 | Bad Odds in Avernus（id:643） | 仅能力值总和为奇数的英雄可用 |
| 强制 + 角色限制 | Kas the DPS（id:1201） | Kas 强制上场，其他 DPS 角色禁用 |
| 去重（种族） | Diversity Day-Trip（id:394） | 阵型中每种种族仅一个 |
| 去重（职业） | A Lesson in Classes（id:1077） | 阵型中每种职业仅一个 |
| 去重（属性值） | Duplicity without Duplicates（id:1463） | 阵型中 DEX 值不可重复 |
| 槽位条件 | Three's a Crowd（id:105） | 相邻多于 1 人时伤害归零 |
| 槽位条件 | Split Up（id:489） | 英雄不可相邻放置 |
| 阵型锁定 | Split The Party 2（id:651） | 放置后不可交换，区域 13/27/37 随机锁定 60% 英雄 |
| 永久死亡 | The Soulmonger Calls（id:185） | 血量上限锁 50%，阵亡永久离队 |
| 全局效果 | Beast Mode（id:14） | 伤害 ×3 但攻速 ÷3 |
| 敌人护甲化 | Durable Deep（id:81） | 所有敌人改为护甲血量（hits-based） |
| 仅暴击伤害 | The Champions That Crit（id:1824） | 普攻仅暴击时造成伤害 |
| 总数限制 | A Tale of Two Champions（id:542） | 同时仅能上场 2 名英雄 |

## 高频组合

变体通常叠加多种机制，最常见的组合：

- **白名单 + 占位**（127 个）：英雄池收窄 + 可用格减少，双重压力
- **强制英雄 + 英雄效果**：强制英雄同时获得特殊 buff（如 Gromma 4x 伤害 + 攻速减 2s）
- **全局效果 + 敌人强化**：全队 debuff 叠加强化敌人，典型生存挑战
- **属性门槛 + 特殊敌人**：英雄池受限的同时面对额外敌人波次

## 赞助人叠加

赞助人限制独立于变体规则，叠加生效。各赞助人常用限制模式（社区整理，非游戏数据直采）：

- 限制英雄使用（按年龄、种族、性别、阵营、归属）
- 不可使用大招或 familiars
- 关卡目标区域提升（`patronObjectiveTiers` 字段记录各赞助人对应目标层数）
- 部分赞助人在区域 25 后锁定阵型（不可增删移英雄）

> **验证标注**：赞助人具体限制清单来自社区 Wiki，非 `variants.json` 直接字段。游戏数据中仅记录 `patronObjectiveTiers`（目标层数提升），赞助人英雄过滤规则存储于 `patrons.json` 的 `forceAllowedHeroIds` + `eligibilityRules`。

## planner 覆盖现状

| 已建模 | 来源机制 | 消费位置 |
|---|---|---|
| 强制英雄 | `force_use_heroes` → `forcedHeroIds` | `recommendationEngine.ts` → `formationLegality.ts`（`forceInclude` 约束）|
| 英雄白名单（id/tag） | `only_allow_crusaders` → `allowedHeroIds`/`allowedTagExpression`（DNF） | `recommendationEngine.ts:filterAndSortCandidateHeroes`（`matchesTagExpression`） |
| 属性门槛 | `restrictions` 文本 → `attributeRequirements` | `recommendationEngine.ts:filterAndSortCandidateHeroes`（`meetsAttributeRequirements`） |
| 占位数量 | `slot_escort` → `escortCount` | `VariantResultCard.tsx:42` 展示，planner 未消费 |

> 覆盖缺口：128 种 mechanics 中 planner 消费强制英雄、英雄白名单（含复合标签表达式）、属性门槛（restriction 文本解析）；全局效果（296）、槽位条件（101）、敌人强化（120）、英雄受伤（39+）、永久死亡（36）、阵型锁定（22）、去重限制（13）等均未建模。

## 数据源

文件：`public/data/v1/variants.json`（1424 条，128 种 mechanics 标记）。

无统一字段标识「这个变体有什么限制」，需结合多个位置：

- `mechanics[]` — 底层机制标记，最可靠的分类依据（128 种，见分类表）
- `restrictions[].original` — 人类可读描述，属性门槛、特殊规则仅存于此
- `allowedHeroIds` / `allowedTagExpression` — 白名单投影（仅 `only_allow_crusaders` 时非空）；tag 表达式为 DNF（OR of ANDs）：`|` = OR，`^` = AND，`!` = 取反
- `forcedHeroIds` — 强制英雄投影
- `escortCount` — 基础占位数（递进占位需看 `slot_escort_by_area` + `restrictions` 文本）

## 提取方法

关键词扫描 `restrictions` 文本提取属性门槛、护甲、暴击等规则：`INT`/`CHA`/`STR`/`DEX`/`CON`/`WIS` + `score`、`ability score total`、`armored`、`hits-based`、`critical hit`。

## 验证标注

- 变体数量、mechanics 标记频率、字段非空计数：基于 `variants.json`（2026-08-06 快照，1424 条）用 `jq` 统计，覆盖全集
- 属性门槛：精确正则 `(CON|INT|CHA|STR|DEX|WIS) score of \d+ or (higher|lower)` 得 31 个，宽松匹配含复合表述约 45 个。旧版计数 57 使用的正则 `INT|CHA|STR` 会误匹配子串（如 "INTentions"），已废弃
- 社区来源（Fandom Wiki、Reddit、Steam）仅作机制概念参考，具体数值与字段以游戏数据为准
- `allowedTagExpression` 中存在括号、`^` 连接的复合表达式（如 `(chaotic^good)`、`!small^!dwarf^!gnome`），2026-08-08 升级为 DNF 结构（OR of ANDs）递归解析，支持嵌套括号分配律（如 v970 `((geneutral|evil)^dps)|(good^support)` → 3 子句）

## 社区来源

- [Fandom Wiki — Variants](https://idlechampions.fandom.com/wiki/Variants)
- [Fandom Wiki — Patrons](https://idlechampions.fandom.com/wiki/Patrons)
- [Reddit r/idlechampions — Patrons 101](https://www.reddit.com/r/idlechampions/comments/1ae6nqf/patrons_101_an_introduction/)
- [Steam 讨论 — 限制型变体](https://steamcommunity.com/app/627690/discussions/0/1635292137567372667/)
