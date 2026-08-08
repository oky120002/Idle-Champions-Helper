# 护甲敌人（armored enemies）

**数据快照**：2026-07-20（165 英雄）

## 机制

护甲敌人的血条分段显示（segmented health）。游戏数据中称为 "armored hit points" / "armored HP" / "armored health"，以整数计数（如 4、10、25、50 格）。护甲必须全部清除后，敌人的正常生命值才能被伤害。

### 击破规则（游戏数据 + 玩家实测）

1. **每次命中最多碎一格**：无论单发伤害多高，一次命中只能击破当前格，溢出伤害不结转到下一格
2. **每格有伤害阈值**：Gazrick 的「护甲剥离」降低的是 "armor threshold"（护甲阈值），说明每格存在一个伤害门槛
3. **伤害与命中都重要**：既需要足够单发伤害达到阈值，又需要足够多的命中次数来逐格清除

> ⚠️ **待实测确认**：单发伤害低于阈值时，是完全无效还是累积扣减格血量？这决定了低系数多段英雄（如 0.33 系数）打护甲的实际效率。

### 多段攻击与护甲的关系

- 系数 1.0 的多段英雄：每发满额伤害，大概率超过阈值，每发碎一格 → 高效
- 系数 0.33 的多段英雄（如法莉德）：每发只有 1/3 伤害，可能低于阈值 → 效率取决于实际数值

**不能简单说「系数对护甲无意义」**——这是之前版本的错误，已修正。

### 特殊变体中的护甲

游戏数据中护甲以整数出现，来自变体描述：

- "4 armored hit points" — 4 格护甲
- "50 armored HP" — 50 格护甲
- "2 additional armored hit points" — 额外 2 格

部分变体还有 "hits-based hit points"（按命中计数），机制可能有差异。

## 专门碎甲机制

| 机制关键词 | 效果 | 数据来源 |
|---|---|---|
| `gazrick_armor_ablation` | 冰冷攻击降低敌人护甲阈值（百分比），可叠加 | effect_string + 描述 |
| `lucius_armor_eating_acid` | 酸液攻击命中时多碎 1~2 格 | 描述文本 |
| Flint 铸火之契 | 被羁绊的英雄每次攻击多碎 1 格（全队乘数） | 描述文本 |
| Grimm 专精 | 每次碎甲后后续多碎 1 格，最多叠 +5，换区重置 | 描述文本 |
| Minthara 5+ 纷争 | 攻击带灵魂烙印的敌人多碎 1 格 | 描述文本 |
| `increase_damage_against_monster_armor_and_hits` | 对护甲/命中型敌人增伤 | effect_string |

这些机制的共同点：改变**每次命中碎几格**（从 1 变成 2+），或降低碎甲门槛。

### 提取方法

无统一字段标识「这个英雄能碎甲」，需从以下位置按关键词扫描：

- `raw.upgrades[].snapshots.original.effect` — 升级效果
- `raw.upgrades[].snapshots.original.effect_keys[].description.desc` — 能力描述文本
- `feats[].effects[].effect_string` — 专长效果
- 关键词：`segment`、`armor`、`护甲`、`segmented health`
