# 护甲敌人（armored enemies）

**数据快照**：2026-07-20（165 英雄）

## 机制

护甲敌人的血条分成一段一段（segmented health）。每段需要单独击破——英雄每次攻击命中（hit）碎一格，**不看伤害数值**，只要碰到就算碎一格。所有格碎完后敌人才能被正常伤害击杀。

因此多段攻击英雄是护甲敌人的天然克星。段数越多、冷却越短，每分钟能碎的护甲格越多。

## 碎甲能力计算

```
每分钟碎甲格数 = 有效段数 × (60 / cooldown)
```

伤害系数（`damageModifier`）对碎甲无意义——0.33 系数的一发和 1.0 系数的一发都只碎一格。所以评估碎甲能力时只看段数和频率，不看系数。

有效段数的提取方法见 [attack-multi-hit.md](./attack-multi-hit.md)。

目标方式（`target`）也有影响：

- `random`：随机选目标，打单体 boss 时全部命中同一敌人
- `front`：打前排，如果 boss 在前排则全部命中
- `highest_health`：自动锁定最肉的目标，打单体 boss 时最优

## 专门碎甲机制

部分英雄拥有直接碎甲的特殊能力，不依赖多段攻击。数据分散在 `effect_string` 和描述文本中，无统一字段：

| 机制关键词 | 效果 |
|---|---|
| `add_attack_targets` | 多段命中（见 multi-hit 文档） |
| `gazrick_armor_ablation` | 冰冷攻击降低敌人护甲阈值（百分比） |
| `lucius_armor_eating_acid` | 酸液攻击命中时多碎 1~2 格 |
| `increase_damage_against_monster_armor_and_hits` | 对护甲敌人增伤 |
| Grimm 专精 | 每次碎甲后后续多碎 1 格，最多叠 +5，换区重置 |
| Flint 铸火之契 | 被羁绊的英雄每次攻击多碎 1 格（全队乘数） |
| Minthara 5+ 纷争 | 攻击带灵魂烙印的敌人多碎 1 格 |

### 提取方法

上述碎甲机制分散在以下位置，需按关键词扫描：

- `raw.upgrades[].snapshots.original.effect` — 升级效果
- `raw.upgrades[].snapshots.original.effect_keys[].description.desc` — 能力描述文本
- `feats[].effects[].effect_string` — 专长效果
- 描述文本需正则匹配关键词（如 `segment`、`armor`、`护甲`）

没有统一的字段标识「这个英雄能碎甲」，需要从效果字符串和描述文本中语义识别。
