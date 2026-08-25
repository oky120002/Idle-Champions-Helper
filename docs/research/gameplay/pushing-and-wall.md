# 推图与墙（Pushing & Wall）

**数据快照**：2026-08-08（`public/data/v1/game-rules.json`，`monster_base_stats` 规则）
**可信度**：✅ 已确认 — 血量/伤害缩放公式由游戏数据直接给出；enrage / overwhelm 机制由社区 + CNE 官方博客交叉确认，游戏数据验证 enrage 计时器参数

**社区来源**：[Reddit — Maths of enemy as areas increase](https://www.reddit.com/r/idlechampions/comments/14tz8y1/)、[Reddit — How High Can Enrage Go?](https://www.reddit.com/r/idlechampions/comments/f923h7/)、[Reddit — Overwhelm at higher levels](https://www.reddit.com/r/idlechampions/comments/1n395yj/)、[Steam — What is your wall?](https://steamcommunity.com/app/627690/discussions/0/3203652426711854932/)、[Steam — CNE Tanking/Healing Update 2018](https://steamcommunity.com/app/627690/discussions/0/1743353164079718808)、[Fandom Wiki — Gold formulas](https://idlechampions.fandom.com/wiki/Gold_formulas)

## 机制

### 怪物血量缩放

怪物血量随区域**指数增长**，基础公式（Fandom Wiki + 游戏数据一致）：

> health = 10 × growth_rate^(area − 1)

growth_rate 不是固定值，而是分段递增（`health_growth_rate_curve`）：

| 区域范围 | growth_rate | 相对前一档 |
|---|---|---|
| 1 – 2000 | **2.031** | 基准 |
| 2001 – 2250 | **3.031** | +49% |
| 2251+ | **4.531** | 再 +49% |

社区经验法则（Reddit u/enshufalahnah）：每 100 区域约需 e30 伤害增量（区域 300 ≈ e90，区域 1000 ≈ e300）。2001 后 growth_rate 跳升意味着同样 100 区域需要 e48，2251 后需 e66。

boss 区域（每 50 层）怪物血量额外 ×1.9，大多数 boss 还有进一步约 ×50 倍率（Fandom Wiki）。

事件/时空门成长更慢（growth_rate 1.85），Avernus 起始血量翻倍且略快（2.035）。

### 怪物伤害缩放

与血量的逐区域增长不同，**怪物攻击力每 50 区域（boss 层）跳跃一次**（Reddit + CNE 2018 博客确认）。游戏数据中 `dps_growth_rate_curve` 体现为阶梯函数：

| boss 区域范围 | 非 boss 层倍率 | boss 层倍率 |
|---|---|---|
| 50 – 2000 | 1×（不变） | **1.75×** |
| 2001 – 2450 | 1× | **4×** |
| 2451+ | 1× | **10,000,000,000×**（100 亿） |

区域 2451 起 boss 层伤害倍率直接变为 100 亿——这是**数学意义上的硬墙**：无论坦克多硬，一次 boss 攻击即团灭。Modron 自动重置上限 2500 区域（`max_modron_auto_reset_area`）也与此一致。

### 墙的三种类型

| 类型 | 根因 | 表现 | 应对 |
|---|---|---|---|
| **DPS 墙（软墙）** | 血量增长 > 伤害增长 | 怪物杀不死，但队伍不会死 | 提升 DPS / 金币寻获量 / 神恩，换阵型 |
| **生存墙** | 怪物伤害 > 坦克/治疗承受 | 队伍被击杀 | 坦克血量共享、击退、免死 |
| **硬墙** | 2451+ boss 伤害 ×100 亿 | 数学上不可能通过 | 无——设计极限 |

Steam 社区定义（u/thegrassyknoll）：墙是「自然推进大幅放缓的区域」，分自动推进墙（仅靠普攻过不了）和手动墙（换人/杀招/药水也过不了）。

### Boss 狂怒（Enrage）

停留同一区域时间过长，敌人进入狂怒状态，伤害持续提升。游戏数据（`monster_base_stats`）参数：

- `power_boost_time`: **10** 秒——每 10 秒触发一次狂怒叠加
- `power_boost_growth_rate`: **1**
- `power_boost_multiplicative`: **false**（加法叠加，非乘法）

**无上限**——社区实测可达 581× 甚至 2000×（Reddit）。Boss 狂怒时视觉上持续变大。CNE 2018 博客确认：每次狂怒叠加**计为一名额外攻击中的敌人**，与部分英雄能力交互（如 Nayeli 的 Aura of Protection、Arkhan 的 Rage of the Dragonborn、Dragonbait 的支援增益均按狂怒层数叠加）。

### 压制（Overwhelm）

坦克英雄有压制值（overwhelm），定义同时能有效承受的怪物数量上限。数据不在 `game-rules.json` 中，而是各英雄属性。

- 怪物数 ≤ 压制值：承受正常伤害
- 怪物数 > 压制值：**所有**攻击中的敌人造成额外伤害，超出越多伤害越高
- 可通过专精和 feat 提升压制值（如 Briv 可达 50）

社区共识（Reddit u/DonnCualinge）：区域 300 后怪物伤害开始超过治疗能力，坦克主要价值转为**血量共享**（保护后排不被 AoE/远程秒杀）；极高区域后怪物伤害完全超过英雄血量上限，坦克血量不再有意义，唯一生存手段变为击退（knockback）、免死（cheat death，如 Myria）和闪避（evade，如 Krydle）。

### 金币-血量比衰减

`health_gold_ratio`（金币掉落 = health^ratio 的指数）从区域 1 的 **0.65** 逐步降至区域 2481 的 **0.3187**。血量增长持续快于金币产出，加剧软墙效应——后期区域金币跟不上升级需求。

## 数据源

| 数据文件 | 字段 | 说明 |
|---|---|---|
| `game-rules.json` → `monster_base_stats` | `base_health` / `health_growth_rate` / `health_growth_rate_curve` | 血量基础值 10、分段增长率 2.031→3.031→4.531 |
| 同上 | `base_dps` / `dps_growth_rate` / `dps_growth_rate_curve` | 伤害基础值 1、boss 层倍率 1.75→4→100 亿 |
| 同上 | `power_boost_time` / `power_boost_growth_rate` / `power_boost_multiplicative` | 狂怒计时器 10 秒、加法叠加 |
| 同上 | `health_gold_ratio` / `health_gold_ratio_curve` | 金币指数 0.65→0.3187（47 段递减） |
| 同上 | `base_speed` / `speed_growth_rate` | 怪物攻击速度基础 50、增长率 1（不随区域提升） |
| 同上 → `max_modron_auto_reset_area` | `area: 2500` | Modron 自动重置上限，与硬墙一致 |

## 提取方法

血量公式（Python 验证用）：

```python
def monster_health(area: int) -> float:
    if area <= 2000:   rate = 2.031
    elif area <= 2250: rate = 3.031
    else:              rate = 4.531
    return 10 * rate ** (area - 1)
```

注意：`health_growth_rate_curve` 的 key 是增长率的**生效起始区域**，不是"第 N 区域的增长率"。区域 2001 切换到 3.031 时，此前 2000 层的累积不重置——是后续区域改用新的指数底数继续累乘。

boss 伤害倍率同理：`dps_growth_rate_curve` 中 key 为 2451 的值 100 亿表示从 boss 区域 2451 起，每次 boss 层伤害 ×100 亿。

## 社区来源

- [Reddit r/idlechampions — Maths of enemy as areas increase?](https://www.reddit.com/r/idlechampions/comments/14tz8y1/maths_of_enemy_as_areas_increase/) — 确认 HP 逐区域缩放、攻击力每 50 区域跳跃
- [Reddit — How High Can Enrage Go?](https://www.reddit.com/r/idlechampions/comments/f923h7/how_high_can_enrage_go/) — 狂怒无上限，实测 581×+
- [Reddit — What is the Point of the Overwhelm Mechanic?](https://www.reddit.com/r/idlechampions/comments/1n395yj/what_is_the_point_of_the_overwhelm_mechanic_at/) — 高区域坦克/压制/治疗失效分析
- [Steam — What is your wall?](https://steamcommunity.com/app/627690/discussions/0/3203652426711854932/) — 墙的社区定义与分类
- [Steam — CNE Tanking/Healing/Offline Gold Update 2018](https://steamcommunity.com/app/627690/discussions/0/1743353164079718808/) — 狂怒叠加计为额外攻击敌人，与英雄能力交互
- [Fandom Wiki — Gold formulas](https://idlechampions.fandom.com/wiki/Gold_formulas) — 血量/金币/boss 倍率公式表
