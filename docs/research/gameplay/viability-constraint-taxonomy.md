# 通关可行性约束图谱（viability constraints）

**数据快照**：2026-08-09（`variants.json` 1424 变体，`hero-abilities.json` 165 英雄）
**可信度**：✅ 已确认 — 约束分类与变体计数由 `jq`/`python` 对 `variants.json` 全集统计直证；护甲门槛面积函数由 `armored-enemies.md` + `pushing-and-wall.md` 交叉确认
**社区来源**：[Reddit — armor-based](https://www.reddit.com/r/idlechampions/comments/ihj4wp/armorbased/)、[Fandom Wiki — Favored Foes](https://idlechampions.fandom.com/wiki/Favored_Foes)、[Steam — CNE Tanking/Healing Update 2018](https://steamcommunity.com/app/627690/discussions/0/1743353164079718808)

## 机制

「阵型能否通关」不是一个单一判定，而是多个独立约束的交集。每个约束都是关于层数的单调函数——越推越难——阵型的推图极限由**最先卡住的那个约束**决定。

### 核心公式

```
wallArea = min(所有约束各自的墙)
```

每个约束产出 `maxArea where 阵型能力 ≥ 层数缩放后的门槛`，与现有 `estimateMaxArea = min(killableArea, survivableArea)` 完全同构。

## 约束分类表

### 击杀约束（能不能打死怪）

| # | 约束 | 机制 | 变体数 | 数据来源 | planner 现状 |
|---|---|---|---|---|---|
| K0 | DPS 墙 | BUD < 怪物生命 | 全部 | `monster_base_stats`（结构化） | ✅ `areaEstimation.killableArea` |
| K1 | 护甲 | 单发 BUD < 段门槛 | 44 | restrictions 文本 | ❌ |
| K2 | 命中型血量 | 需命中 N 次（不看伤害） | 8 | restrictions 文本 | ❌ |
| K3 | 暴击门控 | 只有暴击才能伤害 | 11 | restrictions 文本 + `debuff_until_crit` tag | ❌ |
| K4 | 伤害来源限制 | 只有特定位置/英雄/tag 能打伤害 | ~137 | restrictions 文本 + `slot_effects` tag | ❌ |
| K5 | 伤害削减 | DPS 被 90-99.99% 削减 | 14+ | restrictions 文本 + `global_effects` tag | ❌ |

### 存活约束（能不能活下去）

| # | 约束 | 机制 | 变体数 | 数据来源 | planner 现状 |
|---|---|---|---|---|---|
| S0 | 生存墙 | 有效生命 < 怪物伤害 | 全部 | `monster_base_stats`（结构化） | ⚠️ 稳态近似，仅报告不过滤 |
| S1 | 敌人强化 | 怪物伤害 ×2~100 | 38 | restrictions 文本 | ❌ |
| S2 | 持续掉血 | 每秒掉 2.5% 最大生命 | 43 | restrictions 文本 | ❌ |
| S3 | 不回血 | 换区不恢复生命 | 18 | `only_heal_on_revive` tag | ❌ |
| S4 | AoE 爆发 | 一波 AoE 全队残血（稳态 EHP 不覆盖） | 未知 | restrictions 文本 | ❌ |

### 策略约束（能不能维持阵型）

| # | 约束 | 机制 | 变体数 | 数据来源 | planner 现状 |
|---|---|---|---|---|---|
| P0 | 永久死亡 | 英雄阵亡后永久离队 | 36 | `perma_death`/`perma_unavailable` tag | ❌ |

## 护甲门槛面积函数

护甲敌人的段门槛**不是固定值，而是随层数增长的面积函数**。两个维度独立增长：

### 1. 段门槛随层数指数增长

```
thresholdAt(area) = monsterHealthAt(area) / segments
                  = (10 × growth_rate^(area-1)) / segments
```

怪物生命随层数指数增长（`pushing-and-wall.md` 确认），段数固定时门槛同步增长。

- 300 层 50 段 boss：每段门槛 ≈ e90/50
- 1000 层 50 段 boss：每段门槛 ≈ e300/50

### 2. 段数本身也会增长

部分变体有递增段数（restrictions 文本）：

| 变体 | 描述 | 段数函数 |
|---|---|---|
| Frost Wave (id:742) | "4 hits-based hit points, every 25 areas +4" | `4 + floor((area-1)/25) × 4` |
| Unlucky Hunters (id:294) | "2 additional armored hit points" | 固定 +2 |
| Starve Them Out (id:325) | "200 armored hit points" | 固定 200 |

### 碎甲判据

```
segmentsAt(area)  = baseSegments + floor((area - startArea) / interval) × additional
thresholdAt(area) = monsterHealthAt(area) / segmentsAt(area)
armorKillableArea = max area where perHitBUD ≥ thresholdAt(area)
```

`perHitBUD` 是英雄对单一目标的单次命中伤害。多段攻击英雄需除以段数（`attack-multi-hit.md`）。

> **planner 实现 备注**：每段门槛 `HP/segments` 始终 ≤ HP，永远弱于基础 BUD 约束（BUD ≥ HP），
> 因此作为 per-hit 碎甲能力判定是正确的，但**不构成面积函数的绑定约束**。
> 护甲变体更难的根因是**击杀吞吐量**下降（需 segments+1 次命中而非 1 次）。
> planner `estimateMaxArea` 采用吞吐量等效门槛 `HP × segments` 捕获此效应（见 `areaEstimation.ts`）。
> 多段攻击英雄的吞吐量优势（每次攻击碎多段）暂未建模，留后续阶段。

## 特殊敌人血量类型对比

| 维度 | hits-based | crit-based | armored |
|---|---|---|---|
| 碎段条件 | **命中即可**（0 伤也碎） | **必须暴击** | 单发伤害 ≥ 门槛 |
| 伤害低于阈值 | 仍碎段 | 非暴击完全无效 | 完全无效 |
| 多段攻击英雄 | 极高效（每段各碎一段） | 看暴击率 | 看单段伤害是否过门槛 |
| 克制手段 | 攻击速度 / 多段攻击 | 暴击率 / 暴击伤害 | BUD / 降低门槛 |
| 变体出现频率 | 8 处 | 11 处 | 44 处 |

详见 [enemy-special-health.md](./enemy-special-health.md)。

## 各约束的评估方式与复杂度

| 约束 | 评估方式 | 前置基建 | 复杂度 |
|---|---|---|---|
| K1 护甲 | perHitBUD vs HP/段数 的面积函数 | 多段攻击系数进 profile | 中 |
| K2 命中型 | 攻击频率 vs 段数（不看伤害） | 攻击频率模型 | 中 |
| K3 暴击门控 | 全队 crit chance > 0%？时限内暴击 N 次？ | crit 频率模型 | 中 |
| K4 伤害来源 | 哪些英雄/位置能打伤害？carry 在有效位置？ | 语义解析（复杂） | 高 |
| K5 伤害削减 | carryDps × damageModifier → 抬高 DPS 墙 | 解析百分比 | 低 |
| S1 敌人强化 | monsterDpsAt × enemyDamageMult | 解析倍率 | 低 |
| S2 持续掉血 | incoming damage += dotRate × maxHealth | 解析百分比/秒 | 中 |
| S3 不回血 | 标记 + 评估治疗信号能否维持跨区 | 治疗吞吐量模型 | 高 |
| S4 AoE 爆发 | 免疫/减伤/临时HP 评估 vs 单次 burst | burst 伤害模型 | 高 |
| P0 永久死亡 | 标记 + warning 级提示 | — | 低（仅标记） |

## 数据可获取性

### 结构化（mechanics tag，有标记但无参数值）

`perma_death`(24)、`perma_unavailable`(12)、`only_heal_on_revive`(16)、`debuff_until_crit`(2)、`slot_effects`(94)、`global_effects`(296)、`monster_enrage_on_spawn`(5)

### 纯文本（restrictions 文本，需正则解析）

护甲段数、hits-based 段数、crit-based 标记、伤害来源限制、伤害削减百分比、敌人伤害倍率、持续掉血百分比。解析模式参照 `restrictions-parser.ts` 已有的属性门槛解析。

## 架构关键洞察

这 10 个约束**不是 10 个独立系统**，而是对两个已有检查（击杀 + 存活）的修饰和扩展：

- K1~K5 都修改「阵型的 carry 能否对敌人造成有效伤害」
- S1~S4 都修改「阵型能否在目标层数存活」
- P0 修改「阵型能否维持足够人数」

架构方案：一个 **ViabilityContext**（场景级，解析变体规则，经 scenario 参数传入），两个检查函数（KillCheck + SurviveCheck），一个组合评估（ViabilityAssessment）。计算器 hermetic 边界不变——viabilityContext 是 scenario 上的新字段，非新数据获取通道。

## 数据源

| 数据 | 文件 / 位置 | 说明 |
|---|---|---|
| 变体 restrictions 文本 | `public/data/v1/variants.json` → `restrictions[].original` | 护甲段数、伤害限制、DoT 等的唯一来源 |
| 变体 mechanics 标记 | 同上 → `mechanics[]` | 128 种标记，有标记无参数值 |
| 怪物 stats | `src/domain/simulator/monsterStats.ts` | 全局缩放曲线（内联常量，非运行时加载） |
| BUD 参数 | `public/data/v1/game-rules.json` rule 14 | 衰减参数（15s grace / exponential / floor 1%） |
| 多段攻击 | `champion-details/<id>.json` → `attacks.base.numTargets` / `damageModifier` | 未进 hero profile（待提取） |
| 暴击基线 | `game-rules.json` rule 29 `default_crit_info` | hero 2.5%/+100%，per-hero 可覆盖 |

## 验证标注

- 约束分类与变体计数：`python` 对 `variants.json` 全集统计 ✅
- 护甲门槛面积函数：`armored-enemies.md` 机制说明 + `pushing-and-wall.md` 血量缩放公式交叉确认 ✅
- 伤害来源限制影响面：正则匹配 `restrictions` 文本中 `only.*damage` / `deal.*damage.*only` 模式 ✅
- 持续掉血变体：正则匹配 `% of.*max health` / `unavoidable damage` 模式 ✅

## 关联

- [armored-enemies.md](./armored-enemies.md) — 护甲机制详解
- [aoe-survival.md](./aoe-survival.md) — AoE 生存四类防御
- [attack-multi-hit.md](./attack-multi-hit.md) — 多段攻击与护甲交互
- [bud-mechanics.md](./bud-mechanics.md) — BUD 追踪与衰减
- [enemy-special-health.md](./enemy-special-health.md) — hits-based / crit-based / armored 对比
- [variant-restriction-catalog.md](./variant-restriction-catalog.md) — 128 种变体机制标记
- [pushing-and-wall.md](./pushing-and-wall.md) — 三种墙（DPS / 生存 / 硬墙）
