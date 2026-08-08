# 暴击机制（critical hits）

**数据快照**：2026-08-08（165 英雄，`game-rules.json` + `hero-abilities.json`）
**社区来源**：[Reddit r/idlechampions — Critical hits, some observations](https://www.reddit.com/r/idlechampions/comments/14hyoai/critical_hits_some_observations/)、[Reddit — How does Crit work?](https://www.reddit.com/r/idlechampions/comments/1bqxjce/how_does_crit_work/)、[Fandom Wiki — Critical Hit](https://idlechampions.fandom.com/wiki/Critical_Hit)
**可信度**：✅ 已确认 — 基础值 2.5%/+100% 由 `game-rules.json` 直证；多重暴击溢出机制 ⚠️ 仅社区观察

## 机制

暴击是英雄和敌人的通用攻击机制：每次基础攻击有概率打出暴击，造成额外伤害。

### 基础值（游戏数据确认）

| 参数 | 英雄 | 敌人 | 数据字段 |
|---|---|---|---|
| 暴击概率 | 2.5% | 2.5% | `default_hero_crit_chance` / `default_monster_crit_chance` |
| 暴击伤害 | +100% | +100% | `default_hero_crit_damage` / `default_monster_crit_damage` |

- 暴击伤害 +100% 表示暴击命中造成 **2 倍**正常伤害（正常 100% + 暴击额外 100%）
- 来源：`public/data/v1/game-rules.json`，`ruleName: "default_crit_info"`（`id: 29`）

> 社区帖文中偶见「基础暴击伤害 500%」的说法，与游戏数据（100）和 Wiki 原文（"100% additional damage"）均不一致，推断为社区误传。以游戏数据为准。

### 暴击与 BUD 的关系（社区确认）

**暴击伤害会设置 BUD。** 开发者在 Dev Insights 直播中确认暴击命中伤害参与 BUD 判定；社区成员（含知名攻略作者 Gaarawarr）实测验证：暴击打出的高额命中确实成为新的 BUD 基准。

- 游戏内 DPS 面板显示的是不含暴击的平均伤害，不代表实际击杀输出
- 实际推墙时，暴击英雄的击杀贡献可能远高于面板 DPS 排名

### 多重暴击（crit chance > 100%）

暴击概率可超过 100%，超出部分转化为多重暴击：

- **101%** = 100% 暴击 + 1% 概率打出双倍暴击（伤害再翻倍）
- **201%** = 必定双倍暴击 + 1% 概率三倍暴击
- 以此类推，每 100% 额外概率增加一层暴击倍率

### 暴击与护甲的关系

暴击产生的是单发放大的命中（2 倍或更高），直接提高超过护甲段门槛的概率：

- 对护甲敌人（armored hit points），暴击命中更容易碎段
- 对多段攻击英雄（系数 0.33），暴击倍率可与多段叠加，将原本无法碎甲的低伤害命中推过门槛

## 高暴击英雄

### 基础暴击概率提升

`hero-abilities.json` 中 `baseCritChancePercent` 字段覆盖默认值的英雄（共 10 名，基础 20%）：

| 英雄 | 基础暴击概率 |
|---|---|
| 贾拉索（Jarlaxle）| 20% |
| 崔斯特（Drizzt）| 20% |
| 凯蒂布莉儿（Catti-brie）| 20% |
| 沃夫加（Wulfgar）| 20% |
| 瑞吉斯（Regis）| 20% |
| 宾温（Binwin）| 20% |
| 莱埃泽尔（Lae'zel）| 20% |
| 瑞文嘉德公爵（Duke Ravengard）| 20% |
| 强心（Strongheart）| 20% |
| 鲍比（Bobby）| 20% |

> Companions of the Hall 阵营成员（崔斯特、凯蒂布莉儿、沃夫加、瑞吉斯、宾温）天然高暴击，是该阵营的核心特色。

### 暴击加成信号

`hero-abilities.json` 中已解析的暴击加成信号：

| 信号类型 | 效果 | 实例 | `rawEffect` |
|---|---|---|---|
| `globalCritChance`（加性）| 全队暴击概率 +N% | 希拉 +2%、瑞文嘉德 +1% | `global_buff_base_crit_chance_add,N` |
| `heroCritChance`（乘性）| 自身暴击概率 ×N% | 瑞吉斯 ×250% | `buff_base_crit_chance_mult,N` |
| `heroCritDamage`（乘性）| 自身暴击伤害 ×N% | 罗茜 ×100% | `buff_base_crit_damage_mult,N` |

### 祝福加成

Light of Xaryxis 第四层祝福「Great Shot, Kid!」：全战役暴击伤害 +400%。

### 未解析的暴击信号（8 个，parser 缺失）

以下暴击相关 `rawEffect` 尚无解析器，不参与 planner 评分：

| 英雄 | rawEffect | 说明 |
|---|---|---|
| 希拉（Sheila）| `global_buff_base_crit_damage,10` | 全队暴击伤害加成 |
| 瑞吉斯（Regis）| `add_crit_effect,10` | 添加暴击效果 |
| 宾温（Binwin）| `binwin_critical_combo` | 暴击连击 |
| 布里格（Brig）| `brig_critical_moment` | 暴击时刻 |
| 凯尔（Kyre）| `if_stunned_buff_base_crit_chance_add,20` | 对眩晕敌人暴击概率加成 |
| 凯尔（Kyre）| `increase_crit_damage_when_monster_stunned,400` | 对眩晕敌人暴击伤害加成 |
| 普温特（Pwent）| `pwent_bleed_crit,20` | 流血敌人暴击概率加成 |
| 沃夫加（Wulfgar）| `stun_on_crit,5` | 暴击时眩晕敌人 |

## 数据源

| 数据文件 | 字段 | 说明 |
|---|---|---|
| `public/data/v1/game-rules.json` | `ruleName: "default_crit_info"`（`id: 29`）| 暴击基础参数容器 |
| 同上 | `default_hero_crit_chance` / `default_monster_crit_chance` | 英雄/敌人暴击概率（2.5%）|
| 同上 | `default_hero_crit_damage` / `default_monster_crit_damage` | 英雄/敌人暴击伤害（+100%）|
| `hero-abilities.json` | `baseCritChancePercent` | 英雄基础暴击概率覆盖（10 名英雄，基础 20%）|
| `hero-abilities.json` | `globalCritChance`（加性）| rawEffect: `global_buff_base_crit_chance_add,N` |
| `hero-abilities.json` | `heroCritChance`（乘性）| rawEffect: `buff_base_crit_chance_mult,N` |
| `hero-abilities.json` | `heroCritDamage`（乘性）| rawEffect: `buff_base_crit_damage_mult,N` |
| `hero-abilities.json` | 8 个未解析 rawEffect | `global_buff_base_crit_damage`、`add_crit_effect`、`binwin_critical_combo` 等（parser 缺失，不参与评分）|

## 验证标注

- **游戏数据确认**：基础值（2.5%/100%）、`baseCritChancePercent`、暴击信号类型与字段名——直接来自 `game-rules.json` 和 `hero-abilities.json`
- **社区确认**：暴击设置 BUD（开发者 Dev Insights 声明 + 社区实测）、多重暴击机制——Reddit 讨论交叉验证
- **Wiki 确认**：基础暴击概率 2.5%、暴击额外伤害 100%——Fandom Wiki「Critical Hit」页面
- **未验证**：暴击伤害加成的叠加方式（加性 vs 乘性）在不同来源间的精确优先级——信号 `amountFunc` 字段提供部分线索（`add`/`mult`），但实战最终值需玩家面板核实

## 社区来源

- [Reddit — Critical hits, some observations](https://www.reddit.com/r/idlechampions/comments/14hyoai/critical_hits_some_observations/)
- [Reddit — How does Crit work?](https://www.reddit.com/r/idlechampions/comments/1bqxjce/how_does_crit_work/)
- [Fandom Wiki — Critical Hit](https://idlechampions.fandom.com/wiki/Critical_Hit)
