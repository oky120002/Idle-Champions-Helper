# 护甲敌人（armored enemies）

**数据快照**：2026-07-20（165 英雄）
**社区来源**：[Steam 讨论](https://steamcommunity.com/app/627690/discussions/0/5118863332768135681/)、[Reddit r/idlechampions](https://www.reddit.com/r/idlechampions/comments/tw8xxp/)、[Fandom Wiki](https://idlechampions.fandom.com/wiki/Favored_Foes)

## 机制

护甲敌人的血条分段显示。游戏数据中称为 "armored hit points" / "armored HP"（以整数计数，如 4、10、25、50 段）。护甲必须全部清除后，敌人的正常生命值才能被伤害。

### 击破规则（社区确认）

1. **每段有伤害门槛**：门槛 = 敌人总生命值 ÷ 段数（boss 通常 50 段）
2. **单发伤害 ≥ 门槛 → 碎一段**：一次命中最多碎一段
3. **单发伤害 < 门槛 → 完全无效**：不是累积扣减，是直接归零，打不出任何效果
4. **溢出伤害浪费**：打出 150 伤害打 100 门槛的段，碎一段，多出的 50 不结转到下一段
5. **看的是 BUD（单次最高伤害），不是 DPS**：DPS 是平均值，护甲判定是逐次命中

> 与 hits-based 敌人的区别：hits-based 是每次命中碎一段（不看伤害）；armored 是每发伤害必须达到门槛才碎。两种机制不同。

### 对多段攻击英雄的影响

- 系数 1.0 的多段英雄：每发满额伤害，大概率超过门槛 → 每发碎一段，高效
- 系数 0.33 的多段英雄（如法莉德）：每发只有 1/3 伤害。**如果 0.33 × 基础伤害 < 门槛，所有命中完全无效**。能否碎甲取决于英雄基础伤害与门槛的比值
- Gazrick 护甲剥离：降低门槛 7%/层（最多 60 层），可以大幅降低碎甲门槛，让低伤害命中也能碎段

### 特殊变体中的护甲

游戏数据中护甲以整数出现，来自变体描述：

- "4 armored hit points" — 4 段护甲
- "50 armored HP" — 50 段护甲
- "2 additional armored hit points" — 额外 2 段

## 专门碎甲机制

| 机制 | 效果 | 数据来源 |
|---|---|---|
| `gazrick_armor_ablation` | 冰冷攻击降低护甲门槛 7%/层（最多 60 层），使低伤害命中也能碎段 | effect_string + 描述 |
| `lucius_armor_eating_acid` | 酸液攻击命中时碎 2 格（正常 1 格） | 描述文本 |
| Flint 铸火之契 | 被羁绊的英雄每次命中多碎 1 格 | 描述文本 |
| Grimm 碎志 | 每次碎甲后后续多碎 1 格，最多叠 +5，换区重置 | 描述文本 |
| Minthara 5+ 纷争 | 攻击带灵魂烙印的敌人多碎 1 格 | 描述文本 |
| Hew Maan Kleeb | 中间列时 boss 护甲/命中型敌人每次攻击碎 2 格 | 描述文本 |
| Windfall 黑龙腐蚀 | 攻击覆酸，碎甲/分段敌人每次多碎 1 格 | 描述文本 |
| Ezmerelda 专精 | 全队对护甲敌人 +100% 伤害（提高超过门槛的概率）| 描述文本 |

### 提取方法

无统一字段标识「这个英雄能碎甲」，需从以下位置按关键词扫描：

- `raw.upgrades[].snapshots.original.effect` — 升级效果
- `raw.upgrades[].snapshots.original.effect_keys[].description.desc` — 能力描述文本
- `feats[].effects[].effect_string` — 专长效果
- 关键词：`segment`、`armor`、`护甲`、`segmented health`、`armor-based`
