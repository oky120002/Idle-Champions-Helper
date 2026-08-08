# 速度机制（speed mechanics）

**数据快照**：2026-08-08（165 英雄，23 名速度标签）
**社区来源**：[Reddit：最低攻击冷却讨论](https://www.reddit.com/r/idlechampions/comments/wkbwxo/what_is_the_minimum_attack_speed_cooldown/)、[Steam：Briv 跳层数学](https://steamcommunity.com/app/627690/discussions/0/1872875054775725577/)、[Steam：速度英雄对比](https://steamcommunity.com/app/627690/discussions/0/3003298578176303902/)、[Fandom Wiki：Briv](https://idlechampions.fandom.com/wiki/Briv)、[Fandom Wiki：Speed 分类](https://idlechampions.fandom.com/wiki/Category:Speed)
**可信度**：✅ 已确认 — Briv 参数/冷却字段/Widdle 特殊覆盖由 champion-details 游戏数据直证；75% 上限由社区+数据交叉确认

## 三个层面

速度不是一个单一属性，而是三个相互独立、可叠加的维度：

| 层面 | 效果 | 作用 |
|---|---|---|
| 攻击冷却缩减 | 缩短英雄攻击间隔 | 单位时间内打出更多次攻击 |
| 过层加速 | 加快敌人刷新、减少击杀需求、缩短区域转换 | 每层停留时间变短 |
| 区域跳过 | 直接跳过整个区域，跳过的 boss 奖励照常发放 | 最强加速，Briv 独占 |

三者乘法叠加：攻击快 × 过层快 × 跳层 = 总推进速度。

## 攻击冷却缩减

### 机制

英雄有基础攻击冷却（`baseAttackCooldown`，3.5–10 秒不等）。速度类英雄可以缩短相邻或全队的攻击冷却。**冷却最多缩减 75%**（社区确认，游戏数据中无显式字段，由引擎硬编码）。

示例：基础冷却 4 秒 → 75% 缩减后下限 1 秒。

### 数据字段

游戏数据中 `reduce_attack_cooldown,X` 的 `kind` 为 `attackSpeedMult`，X 为缩减秒数。共 16 名英雄拥有此信号（数据验证）：

| 英雄 | 缩减值（秒） | 备注 |
|---|---|---|
| Lae'zel（莱埃泽尔） | 4.0 | |
| Vlithryn（维列瑟琳） | 3.0 | |
| Evandra（伊万德拉） | 2.0 | |
| Virgil（维吉尔） | 1.0 | 相邻英雄 |
| Selise（赛丽斯） | 1.0 ×3 | 含 buff_upgrade 强化 |
| Korth（科思） | 0.5 ×3 | 仅未击杀时生效 |
| Stoki / Merilwen / NERDS 等 | 0.25–0.5 | |

> 威德尔（Widdle）不使用 `reduce_attack_cooldown`，而是用 `widdle_base_attack_cooldown_override` 直接覆盖相邻英雄的基础冷却，另带 `chance_on_attack_to_reset_attack_cooldown`（25% 概率重置冷却）。她的效果不占 75% 缩减名额，可达更低值。

## 过层加速

### 刷新与计数加速

| 英雄 | 效果字段 | 说明（社区 + 数据） |
|---|---|---|
| Deekin（迪金） | `increase_monster_spawn_time_mult` | 敌人刷新更快 |
| Widdle（威德尔） | `increase_monster_spawn_time_mult` | 同上，且覆盖相邻英雄冷却 |
| Sentry（哨兵） | — | 降低过关击杀数门槛 |
| Minsc（明斯克） | — | 概率双倍/三倍刷新 |
| Havilar（哈维拉） | — | 魔物击杀计为 2 个 |
| Hew Maan（休·曼） | `hewmaan_fellow_humans` | 减少区域推进所需击杀数 |
| Shandie（珊蒂） | `time_scale_when_not_attacked,25,30` | 30 秒未受攻击 → 游戏速度 +25%（类似小型速度药水） |
| Diana（戴安娜） | `area_transition_time_scale` | 缩短区域间转换动画时间 |

> 标注「—」的英雄其效果来自私有描述文本，`hero-abilities.json` 中无统一 `rawEffect` 字段，需从能力描述提取。

## 区域跳过（Briv）

### 异常加速（Unnatural Haste）

Briv（ID 58）独有的跳层机制。游戏数据字段：`briv_unnatural_haste,25,50,4,0,0`

| 参数位 | 值 | 含义 |
|---|---|---|
| 跳层概率 | 25 | 基础 25% 概率（可被装备槽 4 强化至 100%+） |
| 最低堆叠 | 50 | 至少 50 层冲刺堆叠才能触发 |
| 消耗比例 | 4% | 每次跳过消耗当前冲刺堆叠的 4% |

### 运作流程

1. Briv 被敌人击中 → 积累钢骨堆叠（`briv_steelbones`）
2. 重置冒险 → 钢骨堆叠全部转化为冲刺堆叠（Sprint Stacks）
3. 冲刺堆叠 **跨重置保留**，不因换冒险而清零
4. 通关新区域时，若冲刺堆叠 ≥ 50 → 按概率跳过下一个区域

### 专精：金属降生（Metalborn）

`briv_unnatural_haste_stack_consume_percent_override,3.2`：消耗比例从 4% 降至 3.2%，每次跳跃更省堆叠，同等堆叠可跳更多层。

### 堆叠消耗数学（社区验证）

公式：`n = LN(50 / S) / LN(1 - r)`（r = 0.04 或 0.032）

| 冲刺堆叠 | 可跳层数（4%） | 可跳层数（3.2%） |
|---|---|---|
| 1,000 | ~74 | ~93 |
| 10,000 | ~130 | ~163 |
| 100,000 | ~187 | ~234 |

### 概率溢出（多跳）

跳层概率超过 100% 时折半：100% → 50% 概率跳 2 层；200% → 50% 概率跳 3 层，以此类推。

专长可改变跳层上限：「Wasting Haste」上限 4 层、「Strategic Stride」上限 9 层、「Accurate Acrobatics」只跳保证层数不掷骰。

> v1.172.1 起 Briv 不能跳过 2500 层以上的区域。

## 速度队组队思路

速度队核心不是 DPS，而是最大化推进效率。典型搭配：Briv（跳层）+ Widdle（覆盖相邻冷却 + 重置概率）+ Deekin/Sentry/Hew Maan（过层）+ Shandie（游戏加速）+ Diana（区域转换）。Briv 跳层适合冲墙推图；短刷（如宝石农场到 250 层）传统速度英雄更稳定，因为 Briv 需在前排挨打积累钢骨。

## 数据源与验证标注

| 数据 | 来源 | 验证状态 |
|---|---|---|
| `reduce_attack_cooldown` / `attackSpeedMult` | `hero-abilities.json` | 游戏数据直证，16 英雄 |
| `briv_unnatural_haste,25,50,4,0,0` | `champion-details/58.json` | 游戏数据直证 |
| `time_scale_when_not_attacked,25,30` | `hero-abilities.json` | 游戏数据直证（Shandie） |
| `area_transition_time_scale` | `hero-abilities.json` | 游戏数据直证（Diana） |
| 75% 冷却缩减上限 | 社区讨论 | 社区确认，数据中无字段 |
| Briv 消耗公式 | [Steam 数学帖](https://steamcommunity.com/app/627690/discussions/0/1872875054775725577/) | 社区推导 + 实测 |
| 概率溢出多跳规则 | Steam 帖 #5 | 社区确认 |
| 不能跳过 2500 层 | Fandom Wiki | 版本 v1.172.1 限制 |
| Sentry/Minsc/Havilar 速度效果 | Steam 速度帖 #9 | 社区描述，数据中无统一字段 |
