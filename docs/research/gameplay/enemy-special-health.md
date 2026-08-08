# 敌人特殊血量类型（hits-based / crit-based / segmented）

**数据快照**：2026-08-08（`public/data/v1/variants.json`）
**社区来源**：[Reddit r/idlechampions — armor-based](https://www.reddit.com/r/idlechampions/comments/ihj4wp/armorbased/)、[Reddit — Segmented health and Armor](https://www.reddit.com/r/idlechampions/comments/1sgk2nj/)、[Fandom Wiki — Favored Foes](https://idlechampions.fandom.com/wiki/Favored_Foes)、[Fandom Wiki — Hits based damage](https://idlechampions.fandom.com/wiki/Category:Hits_based_damage)
**可信度**：✅ 已确认 — hits-based/crit-based 机制由变体描述文本 + 社区交叉确认；crit-based 碎段规则 ⚠️ 仅 1 处并列证据

> 护甲敌人（armored）有[专门文档](./armored-enemies.md)，本文聚焦其余类型并做对比。

## 机制说明

### hits-based（命中型血量）

敌人血条分为 N 段，**每次被命中碎一段**，不看伤害数值——哪怕伤害为 0 的命中也能碎段。N 次命中击杀。

社区原话：「Hit based means you just need to hit to take off a chunk.」（[Reddit](https://www.reddit.com/r/idlechampions/comments/ihj4wp/armorbased/)）

Fandom Wiki 定义：「health divided into a certain number segments that require a Champion to attack said foe the same number of times equal to the number of segments.」（[Fandom](https://idlechampions.fandom.com/wiki/Favored_Foes)）

### crit-based（暴击型血量）

只有**暴击命中**才能碎段或破坏护盾。非暴击命中完全无效。变体中有两种形态：

1. 直接标注 crit-based health（Volo 变体三强盗之一）
2. 「special shield」机制：敌人先出现特殊护盾，必须用暴击摧毁后正常血条才暴露（Duke Ravengard / Kyre / Laurana 变体）

### segmented health（分段血量， umbrella 术语）

**不是一个独立类型**，是 hits-based 和 armor-based 的上位统称。变体描述和英雄能力中常说「armored or segmented health」——这里 segmented 泛指所有分段式血量，包含 hits-based。

少数变体直接赋予敌人「segmented health」而不区分具体子类型（如 Nordom 变体：构造体敌人获得 4 段 segmented health），此时具体碎段规则（看伤害还是看命中）由游戏内部按默认逻辑处理。

### static health（不存在）

**游戏中不存在 "static health" 血量类型。** 变体数据中 `static` 仅出现在以下语义中：

- `static_monsters_by_area` — 刷怪模式 ID（在固定区域生成特定怪物），不是血量类型
- 「static bosses」— 不移动的固定 boss（stationary），与血量机制无关

社区同样无此术语的讨论。**本文后续不再涉及 static health。**

## 变体数据中的出现方式

### hits-based（8 处）

| 描述格式 | 含义 |
|---|---|
| `20 hits-based HP` | 20 段命中型血量（Shadar-Kai Soul Monger） |
| `hits-based health` | 命中型血量（Cleaning Supplies 等） |
| `4 hits-based hit points` | 4 段命中型血量（Frost Giant） |
| `4 additional hits-based hit points every 25 areas` | 每 25 区域 +4 段（递增） |

另有 1 处 `armored hit-based health`——同时具备护甲和命中型特征。

### crit-based（4 处）

| 变体 | 描述 |
|---|---|
| Volo（三强盗） | 一个强盗为 crit-based health（与 hits-based、armor-based 各一并列出现） |
| Duke Ravengard | 区域 10 后敌人带 special shield，必须暴击摧毁 |
| Kyre | 区域 50 后 boss 带 5 段 segmented special shield，每段须暴击摧毁 |
| Laurana | 区域 50 后 boss 带 special shield；区域 500 后需 5 次暴击摧毁 |

### segmented（9 处）

多为「armored or segmented health」并列用法（统称），少数变体直接赋予「N segmented health」。

## 与护甲（armored）的区别对比

| 维度 | hits-based | crit-based | armored |
|---|---|---|---|
| 碎段条件 | **命中即可**（不看伤害） | **必须暴击** | 单发伤害 ≥ 门槛 |
| 伤害低于阈值 | 仍碎段（0 伤也碎） | 非暴击完全无效 | 完全无效 |
| 溢出结转 | 不结转 | 不结转 | 不结转 |
| 多段攻击英雄 | 极高效（每段命中各碎一段） | 看暴击率，不天然高效 | 看单段伤害是否过门槛 |
| 克制手段 | 提升攻击速度 / 多段攻击 | 提升暴击率 / 暴击伤害 | 提升 BUD / 降低门槛 |
| 变体出现频率 | 8 处 | 4 处 | 45 处 |

## 专门克制机制

社区和 Wiki 记录的碎段加成能力大多**同时覆盖 hits-based 和 armor-based**（如 Binwin、Grimm、Hew Maan Kleeb、Selise、Windfall），详见 [armored-enemies.md](./armored-enemies.md) 碎甲机制表——这些能力对 hits-based 同样有效。

crit-based 目前无专属克制英雄，核心策略是堆暴击率（如 Catti-brie 标记全队可暴击、Brig Hellclaw Critical Moment）。

## 验证标注

- hits-based / crit-based 机制说明：社区共识（Reddit + Fandom Wiki），与游戏内行为一致 ✅
- 变体计数：`rg` 直接搜索 `variants.json`，可复现 ✅
- crit-based 碎段规则（暴击才碎）：来自 3 个变体描述的明确文本（"must be hit with a critical hit"）✅
- crit-based 与 hits-based/armored 三者并列：Volo 变体原文明示 ⚠️（仅 1 处直接证据，机制细节依赖描述文本推断，无官方数值公式）
- static health 不存在：变体数据穷举确认 + 社区无讨论 ✅
- segmented 作为 umbrella 术语：Fandom Wiki 用法 + 变体描述用语一致 ✅
