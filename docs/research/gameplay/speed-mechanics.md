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

### 1. 区域跳过（Briv 独占）

**数据字段**：`briv_unnatural_haste,25,50,4,0,0`（champion-details/58.json）

| 参数位 | 值 | 含义 |
|---|---|---|
| 跳层概率 | 25% | 基础概率（装备槽 4 可强化至 100%+） |
| 最低堆叠 | 50 | 至少 50 层冲刺堆叠才能触发 |
| 消耗比例 | 4% | 每次跳过消耗当前冲刺堆叠的 4%（专精 Metalborn 降至 3.2%） |

**运作流程**：
1. Briv 被敌人击中 → 积累钢骨堆叠（`briv_steelbones`）
2. 重置冒险 → 钢骨堆叠全部转化为冲刺堆叠
3. 冲刺堆叠**跨重置保留**
4. 通关新区域时，若冲刺堆叠 ≥ 50 → 按概率跳过下一个区域

**概率溢出（多跳）**：跳层概率超过 100% 时折半。100% → 50% 概率跳 2 层；200% → 50% 概率跳 3 层。专长改变跳层上限（Wasting Haste 4 层 / Strategic Stride 9 层 / Accurate Acrobatics 只跳保证层数）。

**堆叠消耗数学**（社区验证）：`n = LN(50/S) / LN(1-r)`，r=0.04 或 0.032

| 冲刺堆叠 | 可跳层数（4%） | 可跳层数（3.2%） |
|---|---|---|
| 1,000 | ~74 | ~93 |
| 10,000 | ~130 | ~163 |
| 100,000 | ~187 | ~234 |

> v1.172.1 起不能跳过 2500 层以上。跳过的 boss 奖励照常发放。

**静态建模**：不可——依赖跨重置持久状态（钢骨堆叠数量）。单冒险快照无法得知当前冲刺堆叠。需用户输入假设值（如 2500 层）。

### 2. 任务需求缩减

降低过关所需击杀数或拾取数（百分比缩减，同类乘法叠加）。

| 英雄 | 效果字段 | 数值 | 说明 |
|---|---|---|---|
| **BBEG** | `chance_reduce_quest_requirement,25,100` | 25% 概率缩减 100% | 效果字段 `bbeg_minion_spawn_rate_reduction,2.5`（降低小怪刷新率，title "Speed Change"） |
| **Nahara** | `chance_reduce_quest_requirement,2,100` | 2% 概率缩减 100% | 概率低但完全跳过需求 |
| **Sentry** | `buff_resolution_chance,10` + `buff_resolution_amount,10` | 10% 概率减少 10% 需求 | 装备槽 3 可强化；社区数据：751 ilvl 达 100% 概率 |

**静态建模**：`effectiveRequirement = baseRequirement × (1 - expectedReduction)`，其中 `expectedReduction = Σ(chance_i × amount_i)`。需求降至 1 时等效直接过关。

### 3. 任务进度倍增

每次击杀敌人或拾取任务物品时，计为多个（倍率，同类乘法叠加）。

| 英雄 | 效果字段 | 说明 |
|---|---|---|
| **Hew Maan** | `hewmaan_fellow_humans` | 核心速度技能；Zrang 为顶部狗头人时生效（需前排）；效果随相邻英雄数增加；装备槽 4 可大幅强化（1015 ilvl = ×9，约 3 杀过关） |
| **Havilar** | `chance_multiply_tagged_monster_quest_rewards,50,2,fiend` | 50% 概率魔族敌人计为 2 个 |
| **Melf** | `chance_multiply_monster_quest_rewards,25,2` | 25% 概率怪物任务奖励 ×2（专精 Extra Supplements） |
| **Virgil** | `chance_multiply_monster_quest_rewards_new,5,2,2` | 5% 概率 ×2 |
| **Dynaheir** | `chance_multiply_favored_foe_quest_rewards,25,2` | 25% 概率偏好敌人 ×2 |

**静态建模**：`progressMultiplier = Π(1 + chance_i × (mult_i - 1))`，其中 mult_i 是第 i 个效果的倍率。

### 4. 敌人刷新加速

缩短敌人从刷新点到可被攻击位置的时间。

| 英雄 | 效果字段 | 数值 |
|---|---|---|
| **Deekin** | `increase_monster_spawn_time_mult,100` | +100%（敌人刷新速度翻倍）；专精 Boss Wants Speed 强化 |
| **Widdle** | `increase_monster_spawn_time_mult,10` | +10% |
| **Melf** | `increase_monster_spawn_time_mult,25` | +25%（专精） |

> Deekin 效果随屏幕上剩余敌人减少而增强（敌越少越快刷）。

**静态建模**：`spawnSpeedMultiplier = 1 + Σ(value_i/100)`。加速后每波到达可攻击位置的时间缩短。

### 5. 额外刷新敌人

每波额外刷出怪物，加速完成击杀任务。

| 英雄 | 效果字段 | 数值 |
|---|---|---|
| **Minsc** | `minsc_boastful,33,10` | 33% 概率额外 1 个，10% 概率额外 2 个（《直吹自擂》） |
| **Ezmerelda** | `spawn_additional_monsters,100` | 100% 概率额外 1 个 |
| **Dynaheir** | `spawn_additional_monsters,50` | 50% 概率额外 1 个 |
| **Melf** | 专精随机三选一之一 | 额外刷新 / 刷新加速 / 任务奖励倍增 |
| **Tatyana** | 装备槽 5 | 额外刷新 |

**静态建模**：`extraEnemies = Σ(chance_i × count_i)`。等效减少完成任务所需波数。

### 6. 游戏时间加速

全局游戏速度乘数（影响所有动画、刷新、移动）。引擎硬编码上限 10×（药水 12.5×）。

| 英雄 | 效果字段 | 说明 |
|---|---|---|
| **Shandie** | `time_scale_when_not_attacked,25,30` | 30 秒未受攻击 → 游戏速度 +25%（《马上回来》/ Ranger Training） |

> 社区备注：Shandie 加速在离线/后台队伍中不一致，不应依赖。

**静态建模**：`timeScale = 1 + Σ(value/100)`，受 10× 上限约束。条件"未受攻击"在推图中常满足（carry 远程不被打），宝石农场中前排挨打时会失效。

### 7. 区域转换加速

缩短区域间转换动画时间。

| 英雄 | 效果字段 | 数值 |
|---|---|---|
| **Diana** | `area_transition_time_scale,50` | +50%（上限 400%，装备槽 2 强化） |

**静态建模**：`transitionSpeedup = 1 + Σ(value/100)`，受上限约束。区域转换动画本身约 1-2 秒，加速后缩短。

### 8. 条件直接过关

满足条件后直接完成当前区域，跳过任务需求。

| 英雄 | 效果字段 | 机制 |
|---|---|---|
| **Lae'zel** | `laezel_straight_to_the_point_chance,100` + `laezel_straight_to_the_point_stacks` | 非首领区域，其他英雄击杀敌人时积累"不耐烦"堆叠；达到 17 层完成当前区域 |
| **Halsin** | `recharge_ultimates_on_use,10` + `expression_on_trigger,area_complete` | 大招使用触发区域完成（`halsin_call_to_action`） |

> Lae'zel 的 `laezel_aberration_hunter_spawn,33` 还额外刷怪。她还带 `reduce_attack_cooldown,4`（相邻冷却 -4s）。异变堆叠（`laezel_ceremorphosis_stacks`）影响不耐烦堆叠上限。

**静态建模**：需评估触发频率。Lae'zel 需要 17 次非自己击杀 → 取决于阵型 DPS 和敌人刷新速度；可近似为"每 N 次击杀完成一层"。

### 9. 同步刷新（Vi 独占）

一波敌人同时出现，而非逐个刷出。

| 英雄 | 效果字段 |
|---|---|
| **Vi** | `simultaneous_monster_spawn_chance_mult,0` |

**静态建模**：减少等待敌人逐个刷新的时间。等效每波到达时间从 max(单个时间) 变为一次刷新。

### 10. 预刷新（Lark 独占）

进入下一区域前提前放置敌人。

| 英雄 | 效果字段 |
|---|---|
| **Lark** | `uggie_handler,100` + `uggie_attack_handler,1` |

**静态建模**：减少下一区域初始等待时间。

### 11. 初期冲层（Thellora 独占）

冒险开始时直接冲到第 N 层（N 取决于战役 favor）。

| 英雄 | 效果字段 |
|---|---|
| **Thellora** | `thellora_plateaus_of_unicorn_run,10` |

**静态建模**：等效"跳过前 N 层"。N 取决于战役 favor（用户输入）。

## 英雄速度效果增强途径

社区 Speed 101 表格（装备/专精/专长增强速度效果）：

| 英雄 | 专长 | 装备 | 其他 |
|---|---|---|---|
| Briv | Wasting Haste / Strategic Stride / Accurate Acrobatics | 槽 4 | — |
| Hew Maan | Walking Lessons / We're a Treant! / The Path is Clear | 槽 4 | 相邻英雄数 |
| Diana | Keep Up / Quickly Now | 槽 2 | — |
| Sentry | Sprint | 槽 3 | — |
| Widdle | You Look Delicious / First Into the Fray | 槽 4 | 相邻英雄数 |
| Melf | Rushed Plans / Melf's Collectors Boots | 槽 4 | 专精 Extra Supplements |
| BBEG | Skipping Ahead | — | — |
| Deekin | Overconfidence | — | 专精 Boss Wants Speed |
| Shandie | Sprinter / Second Wind | — | — |
| Nahara | — | — | 专精 A Skilled Lyre |
| Havilar | High Road to Hell | — | — |
| Halsin | Righteous Momentum / Kick the Door Down | 槽 4 | — |
| Lae'zel | No Time To Explain / Hurry Up! | — | 异变堆叠数 |
| Virgil | Take 'Em Down | 槽 5 | 阵型中 RoW 英雄 |
| Thellora | Thin Their Ranks | — | 战役 Favor |
| Lark | Solo Artist / Here for a Lark | 槽 3 | — |
| Vi | Have a Little Respect | 槽 4 | — |
| Tatyana | — | 槽 5 | — |

> 社区共识：Diana 和 Hew Maan 是装备投资最优先速度英雄（回报最高）。

## 社区组队思路

### 宝石农场阵型（短刷，~250 层）

核心：Briv（跳层）+ Hew Maan（任务倍增）+ Widdle（刷新加速 + 冷却覆盖）+ Deekin（刷新加速）+ Shandie（游戏加速）+ Diana（区域转换加速）。Briv 需在前排挨打积累钢骨——短刷中需精确计算重置层数使冲刺堆叠自给自足。

### 冲墙推图阵型

速度英雄帮助快速冲过简单层 → 到达墙后换 DPS 队。Briv 跳层在推图中帮助跳过 boss 层（boss 层最慢）。Thellora 初期冲层在推图开局节省大量时间。

### 社区当前最佳速度英雄排序（综合多个来源）

1. **Briv** — 跳层机制独占，装备投资后可跳 4-9 层/次
2. **Hew Maan** — 任务倍增，装备投资后 3 杀过关
3. **Diana** — 区域转换加速，装备投资回报高
4. **Widdle** — 刷新加速 + 相邻冷却覆盖 + 重置概率
5. **Deekin** — 刷新加速（无装备投资需求）
6. **Shandie** — 游戏加速（无装备投资需求）
7. **Sentry** — 任务需求缩减（装备可强化至 100%）
8. **BBEG** — 任务需求缩减 + 小怪刷新降速
9. **Melf** — 随机三选一速度效果
10. **Lae'zel** — 条件直接过关（特定关卡极强）

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

## 数据源

| 数据 | 来源 | 验证状态 |
|---|---|---|
| 11 类速度效果分类 | Gaarawarr Speed Champions 101（2026-01） | ✅ 社区权威确认 |
| 各英雄效果字段 | `champion-details/*.json` effect_keys | ✅ 游戏数据直证 |
| Briv 跳层参数 + 消耗公式 | champion-details/58.json + Steam 数学帖 | ✅ 数据 + 社区推导 |
| Hew Maan 任务倍增机制 | champion-details/75.json + Steam 自动化攻略 | ✅ 数据 + 社区确认 |
| 装备/专精/专长增强表 | Gaarawarr Speed 101 | ✅ 社区确认 |
| 社区最佳排序 | 综合 Gaarawarr + Steam + Reddit | ⚠️ 社区共识，非严格排名 |
| Shandie 离线不一致 | Gaarawarr 备注 | ⚠️ 社区经验 |

## 社区来源

- [Speed Champions 101 — Gaarawarr（Reddit）](https://www.reddit.com/r/idlechampions/comments/1aleren/speed_champions_101_an_introduction/) — 社区权威速度指南，2026-01 更新
- [Steam — Briv+Hew Maan 自动化攻略](https://steamcommunity.com/sharedfiles/filedetails/?id=2615977602) — Carefully Balanced Automation，2025-12 最终更新
- [Steam — Briv 跳层数学](https://steamcommunity.com/app/627690/discussions/0/1872875054775725577/) — 堆叠消耗公式推导
- [Steam — 速度英雄对比](https://steamcommunity.com/app/627690/discussions/0/3003298578176303902/) — 英雄速度能力对比
- [Fandom Wiki — Briv](https://idlechampions.fandom.com/wiki/Briv)
- [Fandom Wiki — Speed 分类](https://idlechampions.fandom.com/wiki/Category:Speed)
- [Gaarawarr's Guide to Speed Champions（YouTube）](https://www.youtube.com/watch?v=svuWXelCp8Q)
