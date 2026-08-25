# 速度英雄社区参考

**数据快照**：2026-08-10
**关联**：[[speed-mechanics]]（机制分类与分析主文档）

## 各机制英雄数据明细

### 1. 区域跳过（Briv）

| 参数位 | 值 | 含义 |
|---|---|---|
| 跳层概率 | 25% | 基础概率（装备槽 4 可强化至 100%+） |
| 最低堆叠 | 50 | 至少 50 层冲刺堆叠才能触发 |
| 消耗比例 | 4% | 每次跳过消耗当前冲刺堆叠的 4%（专精 Metalborn 降至 3.2%） |

堆叠消耗数学：`n = LN(50/S) / LN(1-r)`，r=0.04 或 0.032

| 冲刺堆叠 | 可跳层数（4%） | 可跳层数（3.2%） |
|---|---|---|
| 1,000 | ~74 | ~93 |
| 10,000 | ~130 | ~163 |
| 100,000 | ~187 | ~234 |

### 2-3. 任务需求缩减 + 进度倍增

| 英雄 | 效果字段 | 数值 |
|---|---|---|
| BBEG | `chance_reduce_quest_requirement,25,100` | 25% 概率缩减 100% |
| Nahara | `chance_reduce_quest_requirement,2,100` | 2% 概率缩减 100% |
| Sentry | `buff_resolution_chance,10` + `buff_resolution_amount,10` | 10% 概率减 10% |
| Havilar | `chance_multiply_tagged_monster_quest_rewards,50,2,fiend` | 50%×2 |
| Melf | `chance_multiply_monster_quest_rewards,25,2` | 25%×2（专精） |
| Virgil | `chance_multiply_monster_quest_rewards_new,5,2,2` | 5%×2 |
| Dynaheir | `chance_multiply_favored_foe_quest_rewards,25,2` | 25%×2 |

### 4-5. 刷新加速 + 额外敌人

| 英雄 | 效果字段 | 数值 |
|---|---|---|
| Deekin | `increase_monster_spawn_time_mult,100` | +100% |
| Widdle | `increase_monster_spawn_time_mult,10` | +10% |
| Minsc | `minsc_boastful,33,10` | 33%×1 + 10%×2 |
| Ezmerelda | `spawn_additional_monsters,100` | 100%×1 |
| Dynaheir | `spawn_additional_monsters,50` | 50%×1 |

### 6-7. 游戏加速 + 区域转换

| 英雄 | 效果字段 | 数值 |
|---|---|---|
| Shandie | `time_scale_when_not_attacked,25,30` | +25%（30 秒未受攻击触发） |
| Diana | `area_transition_time_scale,50` | +50%（上限 400%） |

### 8. 条件直接过关

| 英雄 | 机制 |
|---|---|
| Lae'zel | 17 层不耐烦堆叠完成区域（非首领区域，其他英雄击杀积累） |
| Halsin | 杀招使用触发区域完成 |

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
