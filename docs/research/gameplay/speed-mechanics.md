# 速度机制（speed mechanics）

**数据快照**：2026-08-10（165 英雄，23 名速度标签）
**社区来源**：[Speed Champions 101 — Gaarawarr](https://www.reddit.com/r/idlechampions/comments/1aleren/speed_champions_101_an_introduction/)（2026-01 更新）、[Steam — Briv+Hew Maan 自动化攻略](https://steamcommunity.com/sharedfiles/filedetails/?id=2615977602)、[Steam — Briv 跳层数学](https://steamcommunity.com/app/627690/discussions/0/1872875054775725577/)、[Steam — 速度英雄对比](https://steamcommunity.com/app/627690/discussions/0/3003298578176303902/)、[Fandom Wiki — Speed 分类](https://idlechampions.fandom.com/wiki/Category:Speed)
**可信度**：✅ 已确认 — 效果字段由 champion-details 游戏数据直证；机制分类由 Gaarawarr Speed 101（社区权威指南）交叉确认

## 核心认知

**速度 ≠ 杀怪快慢**。速度是指**快速推进层数的能力**。速度英雄通过各不相同的机制加速过层，不是通过提高 DPS。速度效益与 DPS/gold 是完全正交的维度，乘法叠加。

> **关键区分**：攻击冷却缩减（`attackSpeedMult`）只影响单位时间攻击次数，对过层速度的间接贡献有限。真正的速度机制是那些直接减少每层停留时间的非伤害效果——它们才是速度队的核心价值。

## 机制分类（11 类）

社区 Speed 101 将所有速度效果归为 11 类。每类独立、同类叠加方式不同、跨类乘法叠加：

| # | 类型 | 作用 | 英雄 | 静态可建模？ |
|---|---|---|---|---|
| 1 | **区域跳过** | 完成区域后概率跳过后续 N 个区域 | Briv | ⚠️ 跨重置状态 |
| 2 | **任务需求缩减** | 降低过关所需击杀/拾取数 | BBEG, Nahara, Sentry | ✅ 百分比乘数 |
| 3 | **任务进度倍增** | 每次击杀/拾取计为多个 | Hew Maan, Havilar, Melf, Virgil, Dynaheir | ✅ 倍率乘数 |
| 4 | **敌人刷新加速** | 缩短敌人从刷新点到可攻击位置的时间 | Deekin, Widdle, Melf | ✅ 乘数 |
| 5 | **额外刷新敌人** | 每波额外刷出怪物 | Minsc, Ezmerelda, Dynaheir, Melf, Tatyana | ✅ 概率期望 |
| 6 | **游戏时间加速** | 全局游戏速度 ×N（上限 10×，药水 12.5×） | Shandie | ✅ 乘数 |
| 7 | **区域转换加速** | 缩短区域间转换动画时间 | Diana | ✅ 乘数 |
| 8 | **条件直接过关** | 满足条件（击杀计数/大招使用）直接完成当前区域 | Lae'zel, Halsin | ⚠️ 条件概率 |
| 9 | **同步刷新** | 一波敌人同时出现而非逐个刷出 | Vi | ✅ 等效加速 |
| 10 | **预刷新** | 进入下一区域前提前放置敌人 | Lark | ✅ 等效加速 |
| 11 | **初期冲层** | 冒险开始时直接冲到第 N 层 | Thellora | ⚠️ 依赖 favor |

> 标注 ✅ = 可静态计算等效加速因子；⚠️ = 依赖运行时状态（跨重置/条件触发），需简化假设

## 各机制详细分析

> 各英雄效果字段、装备/专精增强途径、社区排序等详细数据见 `speed-community-reference.md`。
> 本节只记每类的建模结论。

### 1. 区域跳过（Briv 独占）

数据字段 `briv_unnatural_haste,25,50,4,0,0`：25% 跳层概率，50 最低堆叠，4% 消耗比例（专精 Metalborn 降至 3.2%）。概率溢出折半（100%→50% 跳 2 层）。堆叠消耗数学（社区验证）：`n = LN(50/S) / LN(1-r)`。**静态建模**：不可——依赖跨重置持久状态，需用户输入假设值。

### 2. 任务需求缩减

BBEG `chance_reduce_quest_requirement,25,100`（25% 概率缩减 100%）、Nahara 2%×100%、Sentry `buff_resolution_chance,10` + `buff_resolution_amount,10`（10% 概率减 10%，装备槽 3 可强化）。

**静态建模**：`1/(1-Σ(chance/100 × amount/100))`。

### 3. 任务进度倍增

Hew Maan `hewmaan_fellow_humans,0`（handler，相邻人类增强）、Havilar 50%×2、Melf 25%×2（专精）、Virgil 5%×2、Dynaheir 25%×2。

**静态建模**：`Π(1+chance/100×(mult-1))`。
| **Hew Maan** | `hewmaan_fellow_humans` | 核心速度技能；Zrang 为顶部狗头人时生效（需前排）；效果随相邻英雄数增加；装备槽 4 可大幅强化（1015 ilvl = ×9，约 3 杀过关） |
| **Havilar** | `chance_multiply_tagged_monster_quest_rewards,50,2,fiend` | 50% 概率魔族敌人计为 2 个 |
| **Melf** | `chance_multiply_monster_quest_rewards,25,2` | 25% 概率怪物任务奖励 ×2（专精 Extra Supplements） |
| **Virgil** | `chance_multiply_monster_quest_rewards_new,5,2,2` | 5% 概率 ×2 |
| **Dynaheir** | `chance_multiply_favored_foe_quest_rewards,25,2` | 25% 概率偏好敌人 ×2 |

**静态建模**：`progressMultiplier = Π(1 + chance_i × (mult_i - 1))`，其中 mult_i 是第 i 个效果的倍率。

### 4. 敌人刷新加速

Deekin `increase_monster_spawn_time_mult,100`（+100%）、Widdle +10%、Melf +25%（专精）。**静态建模**：`1+Σ(value/100)`。

### 5. 额外刷新敌人

Minsc `minsc_boastful,33,10`（33%×1+10%×2）、Ezmerelda 100%、Dynaheir 50%、Farideh/Hank（专精）。**静态建模**：`1+Σ(chance/100×count)`。

### 6. 游戏时间加速

Shandie `time_scale_when_not_attacked,25,30`（30 秒未受攻击 → +25%，上限 10×）。**静态建模**：`min(1+Σ(value/100), 10)`。

### 7. 区域转换加速

Diana `area_transition_time_scale,50`（+50%，上限 400%）。**静态建模**：`min(1+Σ(value/100), 5)`。

### 8. 条件直接过关

Lae'zel（17 层不耐烦堆叠完成区域）、Halsin（大招触发区域完成）。**静态建模**：需触发频率评估，依赖运行时 DPS 和刷新速度。

### 9. 同步刷新（Vi 独占）

`simultaneous_monster_spawn_chance_mult,0`（handler）。**静态建模**：二值加成（英雄在场即生效）。

### 10. 预刷新（Lark 独占）

`uggie_handler,100`（handler）。**静态建模**：二值加成（英雄在场即生效）。

### 11. 初期冲层（Thellora 独占）

`thellora_plateaus_of_unicorn_run,10`。**静态建模**：等效"跳过前 N 层"，N 依赖 favor（用户输入）。

## 速度效益量化模型（planner 集成方向）

速度队的 objectiveValue 不是 DPS 或 BUD，而是**区域推进效率**——单位时间通过的层数。可建模为每层停留时间的缩减因子之积：

```
timePerArea = baseTimePerArea / (spawnSpeedMult × questProgressMult × timeScale × transitionSpeedup × ...)
```

其中各因子：
- `spawnSpeedMult = 1 + Σ(spawn_speed_effects)`（类型 4）
- `questProgressMult = Π(quest_multiplier_effects)`（类型 2+3 合并）
- `timeScale = 1 + Σ(time_scale_effects)`（类型 6，上限 10×）
- `transitionSpeedup = 1 + Σ(transition_effects)`（类型 7）
- `extraEnemies` 和 `spawnSimultaneously` 影响击杀任务完成时间（类型 5+9）
- Briv 跳层贡献独立的 `areasSkippedPerArea` 因子（类型 1）

**挑战**：
1. 多数效果依赖运行时状态（敌人剩余数、是否被攻击、触发概率随机结果）
2. Briv/Lae'zel/Halsin 的效果依赖跨重置或动态条件
3. 不同关卡的任务类型不同（击杀/拾取/boss），不同速度效果对不同任务类型的贡献不同
4. baseTimePerArea 本身不可静态得知（取决于敌人血量、阵型 DPS、关卡布局等运行时因素）

**可行路径**：先建模可静态计算的效果（类型 2-7、9-10），输出为"速度因子"而非绝对时间。Briv/Lae'zel 等动态效果标记为"需用户输入假设值"。

社区参考（增强途径/组队/排序/来源）见 `speed-community-reference.md`。
