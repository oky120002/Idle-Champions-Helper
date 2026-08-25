# 次要游戏机制总览（Game Modes / Resets / Weekends / Notary / Tokens / 大数字）

**数据快照**：2026-08-10
**社区来源**：[Fandom Wiki: Game Modes](https://idlechampions.fandom.com/wiki/Game_Modes)、[Resets](https://idlechampions.fandom.com/wiki/Resets)、[Weekends](https://idlechampions.fandom.com/wiki/Weekends)、[Notary](https://idlechampions.fandom.com/wiki/Notary)、[Tokens](https://idlechampions.fandom.com/wiki/Tokens)、[Large number abbreviations](https://idlechampions.fandom.com/wiki/Large_number_abbreviations)
**可信度**：✅ 已确认 — 社区+游戏数据交叉验证；标注矛盾处

> 本文记录对 planner 影响较小的辅助机制，合并为一篇避免碎片化。

## 游戏模式（Game Modes）

IC 的冒险有几种模式变体：

| 模式 | 说明 | favor 奖励 |
|---|---|---|
| Regular Adventure | 故事冒险，首次完成解锁英雄/成就 | 对应战役 favor |
| Variant | 带特殊限制规则的变体 | 对应战役 favor |
| Free Play | 自由游戏，无限推进 | 仅对应战役 favor |
| Patron Variant | 带赞助者限制的变体 | favor + 赞助者货币 |
| Patron Free Play | 带赞助者的自由游戏 | favor（不奖赞助者货币） |

✅ wiki Adventures 页面确认 "除教程外，每个冒险都有 Free Play 变体"

## 重置（Resets）

重置是 IC 核心循环——重置当前冒险进度以将积累的 favor 永久化。

### 重置保留 / 丢失规则 ✅

| 项目 | 重置后 |
|---|---|
| 神恩（Divine Favor） | ✅ 保留 |
| 宝石（Gems） | ✅ 保留 |
| 宝箱（Chests） | ✅ 保留 |
| 英雄等级 | ❌ 归零（Bruenor 起始 Lv1） |
| 金币 | ❌ 归零 |
| 装备/专长/属性 | ✅ 保留 |

- 重置 Blessings 升级花费 1% favor（返还 99%）
- favor 的金币寻获量加成永久有效（每点 favor +1% gold find），不受重置影响

## 周末促销（Weekends）

周末是限时促销活动，通常持续周末数天：

- 可购买特殊 Gold Chests 和 Golden Gear
- 每个周末有特定主题（如 Carefully Balanced Weekend、Story of Doom Weekend）
- 订阅 newsletter 可获得每周专属周末宝箱兑换码
- 对 planner 无直接影响（纯经济/促销机制）

## 公证人（Notary）

Notary 是契约转换系统：

- 允许 Blacksmithing Contracts 和 Bounty Contracts 在不同稀有度间**免费转换**
- 可直接将 Bounty Contracts 转为 Event Tokens
- Reddit 实测：25 个 Gold Chests = 555 reagents（22.2/chest）
- 对 planner 无直接影响（经济转换工具）

## 代币（Tokens）

Event Tokens 是参与限时事件的入场货币：

- 从所有冒险中的怪物定期掉落
- 用于支付 Event Adventures、Variants 和 Free Plays 的入场费
- 可通过 Notary 从 Bounty Contracts 转换获得
- 对 planner 无直接影响（事件入场系统）

## 药剂师（Apothecary）

Apothecary 是药水合成系统：

- 每周可免费获得一个 Legendary Vessel（Day 7 日常奖励）
- 可合成/升级药水
- 对 planner 无直接影响（药水经济系统）

## 大数字缩写（Large Number Abbreviations）

IC 使用短尺度（short scale）命名法，每 1000 倍一个后缀：

| 缩写 | 名称 | 值 | | 缩写 | 名称 | 值 |
|---|---|---|---|---|---|---|
| K | Thousand | 10³ | | d/Dc | Decillion | 10³³ |
| M | Million | 10⁶ | | U/Udc | Undecillion | 10³⁶ |
| B | Billion | 10⁹ | | D/Ddc | Duodecillion | 10³⁹ |
| t/T | Trillion | 10¹² | | T/Tdc | Tredecillion | 10⁴² |
| q/Qa | Quadrillion | 10¹⁵ | | v/Vg | Vigintillion | 10⁶³ |
| Q/Qi | Quintillion | 10¹⁸ | | Tg | Trigintillion | 10⁹³ |
| s/Sx | Sextillion | 10²¹ | | qg/Qd | Quadragintillion | 10¹²³ |

> 游戏极限约 6×10⁹⁰⁶，使用 decimal.js 的容量天花板 10^(10¹⁶) 永远用不完（见 ADR 0014）。

### 与 GameNumber 的关系 ✅

我们的 `GameNumber` 类已实现完整的大数字表示和比较，不依赖 wiki 缩写表。缩写表仅用于 UI 显示层格式化。

## 社区来源

| URL | 来源 | 主题 |
|---|---|---|
| https://idlechampions.fandom.com/wiki/Game_Modes | Wiki | 游戏模式 |
| https://idlechampions.fandom.com/wiki/Resets | Wiki | 重置机制 |
| https://idlechampions.fandom.com/wiki/Weekends | Wiki | 周末促销 |
| https://idlechampions.fandom.com/wiki/Notary | Wiki | 公证人 |
| https://idlechampions.fandom.com/wiki/Tokens | Wiki | 事件代币 |
| https://idlechampions.fandom.com/wiki/Large_number_abbreviations | Wiki | 大数字缩写 |
| https://idlechampions.fandom.com/wiki/Adventures | Wiki | 冒险模式 |
| https://www.reddit.com/r/idlechampions/comments/1l3e6xp/notary_system_and_potion_reagents/ | Reddit | 公证人实测 |
