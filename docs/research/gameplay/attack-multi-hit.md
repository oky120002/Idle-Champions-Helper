# 多段攻击（multi-hit）

**数据快照**：2026-07-20（165 英雄）

## 机制

部分英雄的基础攻击一次能打多个目标。每个目标算一次独立命中（hit），触发独立的伤害判定和 BUD 更新。

描述文本中的 `$attack_num_targets` 是游戏运行时变量，值由攻击定义的 `num_targets` 加上升级/专精/专长/装备的加成决定。

## 数据源

### 基础段数

文件：`public/data/v1/champion-details/<id>.json`

```
.attacks.base.numTargets    → 基础每次攻击命中数（默认 1）
.attacks.base.damageModifier → 每发伤害系数（1.0 = 满额，0.33 = 每发 1/3）
.attacks.base.cooldown      → 攻击冷却（秒）
.attacks.base.target        → 目标方式（random / front / highest_health）
```

### 段数加成效果

效果字符串格式：`add_attack_targets,<amount>[,<attackId>]`

- 带 `attackId`：只加成指定攻击（如法莉德的 `add_attack_targets,1,137`）
- 不带 `attackId`：加成英雄所有攻击（如 `add_attack_targets,1`）

**数据位置分散在三处**，需分别扫描：

| 来源 | 路径 | 格式 |
|---|---|---|
| 升级 | `raw.upgrades[].snapshots.original.effect` | 纯字符串 **或** JSON 编码字符串 `{"effect_string":"..."}` |
| 专长 | `feats[].effects[].effect_string` | 纯字符串 |
| 装备 | `raw.loot[].snapshots.original.effects[].effect_string` | 纯字符串 |

### 概率性变体

`chance_add_attack_targets,<amount>,<attackId>,<effectIds...>` — 有几率额外命中。数据源同升级路径。

## 提取方法

```
有效段数 = numTargets + Σ(升级 add_attack_targets) + Σ(专长 add_attack_targets) + Σ(装备 add_attack_targets)
每分钟命中 = 有效段数 × (60 / cooldown)
```

### 三个坑

1. **effect 字段两种格式**：有的升级 `effect` 是纯字符串 `"add_attack_targets,1,137"`，有的是 JSON 编码的字符串 `"{\"effect_string\":\"add_attack_targets,1,310\",...}"`。提取时先检测是否以 `{` 开头，是则 JSON 解析取 `effect_string`。
2. **快照去重**：每个升级同时存 `snapshots.original` 和 `snapshots.display`（中英文），扫描时只取一个。多个升级可能有相同效果，按升级 ID 去重后各自计入。
3. **描述变量**：描述文本 `$attack_num_targets` 会被运行时替换为实际值，但 JSON 里的 `num_targets` 是基础值，不反映加成。

## 伤害系数的意义

`damageModifier < 1` 时每发伤害打折，但总伤害 = 段数 × 系数。例如：

- 系数 0.33、段数 3 → 单轮总倍率 0.99×（几乎等于单发满伤）
- 系数 0.33、段数 7 → 单轮总倍率 2.31×

系数 1.0 的多段英雄每发打满额，总倍率 = 段数。

## 与护甲的交互

护甲敌人按命中次数碎甲，不看单发伤害 → 系数 0.33 和 1.0 碎甲效果相同。详见 [armored-enemies.md](./armored-enemies.md)。
