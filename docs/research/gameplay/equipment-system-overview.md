# 装备系统总览（Equipment / Chests / Rarity）

**数据快照**：2026-08-10（loot-catalog.json + champion-details，165 英雄）
**社区来源**：[Fandom Wiki: Gear](https://idlechampions.fandom.com/wiki/Gear)、[Fandom Wiki: Chests](https://idlechampions.fandom.com/wiki/Chests)、[Reddit: Equipment levels and rarities](https://www.reddit.com/r/idlechampions/comments/wqacoe/understanding_equipment_levels_and_rarities/)
**可信度**：✅ 已确认（游戏数据直证） + ⚠️ 社区说法与数据矛盾处已标注

## 机制

### 装备槽位

每英雄 3-6 个装备槽（slotId），每槽有 4 种稀有度的装备版本（rarity 1-4 = Common/Uncommon/Rare/Epic）。装备效果以 effect_string 表示（如 `global_dps_multiplier_mult,10`），数值随稀有度递增。

### 稀有度效果缩放（游戏数据实测）

| rarity → 效果值倍率（相对 rarity 1） | 均值 | 范围 | 样本 |
|---|---|---|---|
| rarity 2 / rarity 1 | **5.32x** | 2.50 - 6.50 | 165 |
| rarity 3 / rarity 1 | **9.64x** | 4.00 - 12.00 | 165 |
| rarity 4 / rarity 1 | **18.32x** | 7.00 - 23.00 | 165 |

> ⚠️ **社区说法与数据矛盾**：Reddit/社区称 "Green(Uncommon) = 2x White(Common), Blue(Rare) = 4x White"。游戏数据实测 rarity 2 实为 ~5.3x，rarity 3 约 9.6x，远高于社区说法。社区倍率可能指 gear level 升级（非 rarity），或来自过时版本。**以游戏数据为准**。

### 固定缩放表（同一英雄同一 slot）

不同英雄同一 slot 的 rarity 效果值高度一致（明斯克 slot 1 = Briv slot 1：10/65/120/230），说明存在全局缩放模板，但不同 effect kind 的基础值不同。

### Shiny 与 Golden Epic

- **Shiny**：装备的增强版本，效果翻倍（社区确认）
- **Golden Epic**：rarity 4 的特殊增强版本，`champion-details` 中 `allowGoldenEpic: true` 标记
- `isGoldenEpic` 字段标记当前物品是否为 Golden Epic 版本

### 宝箱（Chests）

| 类型 | 内容 | 来源 |
|---|---|---|
| Silver Chest | Common/Uncommon/Rare 装备 + 药水/契约 | 游戏内掉落、宝石购买 |
| Gold Chest | Uncommon/Rare/Epic 装备 + 药水/契约 | 宝石购买、活动奖励 |
| Electrum Chest | 特殊装备 | 活动兑换码、特殊奖励 |

- Gold Chest 掉 5 张卡：2 张保证装备，其余为药水/契约/feat（feat 约 4% 概率）
- 宝箱是获取装备和 Shiny/Golden Epic 的主要途径

## 数据源

| 字段 | 位置 | 说明 |
|---|---|---|
| `loot-catalog.json` | `items[]` | 全量装备目录：`{heroId, slotId, rarity, effectString}` |
| `champion-details/<id>.json` | `loot[]` | 每英雄装备详情：含 name/description/graphicId/allowGoldenEpic/isGoldenEpic |
| `rarity` | 上述两处 | `"1"`-`"4"`，对应 Common/Epic |

## 与 planner 的关系

装备效果已通过 loot-catalog 接入评估模型（见 `docs/research/data/planner/equipment-and-abilities.md`）。loot effect 的 effect_string 被 build 期烘进 hero-abilities.json，owned-aware 五通道（hero_dps/global_dps/health/gold/crit）placement-aware 注入。装备稀有度缩放精确值由 loot-catalog 直证，不依赖社区倍率。
