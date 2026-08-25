# Modron 自动化（Modron Automation）

**数据快照**：2026-08-08（165 英雄）
**社区来源**：[Fandom Wiki — Modron Automation](https://idlechampions.fandom.com/wiki/Modron_Automation)、[Fandom Wiki — Modron Core](https://idlechampions.fandom.com/wiki/Modron_Core)、[Steam 进阶指南](https://steamcommunity.com/sharedfiles/filedetails/?id=2615977602)、[Reddit r/idlechampions](https://www.reddit.com/r/idlechampions/comments/hvnz38/)、[官方博客（7 天能量限制）](http://codenameentertainment.com/?page=blog&post_id=1074)、[社区核心配置库 Encyclopedia Modronica](https://emmotes.github.io/ic_modron_library/)
**可信度**：⚠️ 待确认 — 核心机制（种类/自动化/7 天限制）由社区+官方博客确认；管道加成的节点基础值、flow 放大和 supercharge 阈值由社区指南（Gaarawarr 视频）和 Encyclopedia Modronica 确认；但完整管道计算逻辑（节点布局→flow 分配→Epic Flow→最终加成）仍为服务端黑箱，不在公开游戏数据中

## 机制

Modron 核心是完成「分队冒险」（Split The Party）系列任务后获得的可成长模块，提供两类功能：**管道加成**（pipe bonuses）和**自动化循环**（auto-reset + auto-formation）。

### 核心获取

| 核心 | 获取方式 |
|---|---|
| 谦逊核心（Modest） | 分队冒险 1 |
| 强壮核心（Strong） | 宝石商店 5×10^5 |
| 快速核心（Fast） | 分队冒险 2 |
| 魔法核心（Magic） | 分队冒险 3 |
| 无从属核心（Unaffiliated） | 赛季 3 免费奖励 / 宝石商店 |
| 灵巧核心（Dexterous） | 赛季 6 免费奖励 / 宝石商店 |
| 埃罗伊斯核心（Aerois） | 赛季 1 通行证付费 / 限时特供 |
| 守序核心（Lawful） | Nordom 活动全部 Tier 3 变体通关 |

> 来源：Fandom Wiki — Modron Core（社区维护，与游戏内购一致）。

### 管道加成

核心内部有一张管道地图（Modron Layout Manager），玩家用管道（Modron Components）将输入（Input）连接到各种输出节点（Outputs）。每个核心有独占的输出节点组合。每升一级解锁 2 个新输出节点，有时附带固定管道。

**输出加成类别**（社区确认）：英雄伤害（All Champions Damage）、金币发现（Gold Find）、生命值（Health/Constitution）、速度（Speed，Fast 核心专属）、自动化（Automation）。每个核心有独占的输出节点组合。

**节点基础值**（Gaarawarr 指南，以 Modest 核心伤害节点为例）：同一类别（伤害）的节点有不同等级——基础 1600%、中级 1800%（火焰标记）、高级 2400%（大火焰标记）。金币和生命节点同理有不同等级。

**Flow 放大**：节点需 flow > 4 才激活全部加成。管道（pipe）本身有基础 flow 值和品质倍率——绿色 +5~20%、蓝色 +40%。**Buff box**（管道分叉→汇合的回路结构）放大 flow 倍率：最简单的 buff box（1 入→分 2→合 1）可将 1 flow 放大到 4.575，组合更多管道和倍率管道可达极高 flow。

**Epic Flow**：当节点 flow 达到极高值（约 5.24×10⁸）时触发 Epic Flow，获得最大加成倍率。

**Supercharge（超载）**：在 Epic Flow 之上的额外乘区，按全核心 flow 阈值分四档（Encyclopedia Modronica 确认）：

| 成就 | 阈值（每节点 flow） | 超载加成 |
|---|---|---|
| Now We're Flowing | 1.00×10³ | +25% |
| Flow Shui | 1.28×10⁵ | +200% |
| Infinite Cosmic Power | 8.19×10⁶ | +350% |
| Pipe Dream | 5.24×10⁸ | +500% |

**各核心满配总加成量级**（社区最优配置，Encyclopedia Modronica）：

| 核心 | 金币加成（全 Epic） | 伤害加成（满超载） | 可超载节点数 |
|---|---|---|---|
| Strong | 4.01×10⁶% | ~10⁴⁵% | 21 |
| Modest | 2.19×10⁶% | ~10⁴⁴% | 21 |
| Fast | 1.20×10⁶% | ~10³⁹% | 21 |
| Magic | 3.78×10⁵% | ~10⁵³% | 25 |
| Aerois | 3.78×10⁵% | ~10⁵⁸%（Lucius DPS + 5 Aerois） | 15 |
| Unaffiliated | 1.19×10⁵% | ~10⁵³%（Unaffiliated DPS + 10） | 23 |
| Dexterous | 1.19×10⁵% | ~10⁵³%（15+ DEX DPS + 10） | 23 |
| Lawful | 1.19×10⁵% | ~10⁵²%（Lawful DPS + 10） | 23 |

> **变量核心**：Aerois / Unaffiliated / Dexterous / Lawful 的伤害加成取决于 carry DPS 是否满足核心条件（如 Lucius DPS、Unaffiliated DPS、15+ DEX DPS、Lawful DPS）和阵型中满足条件的英雄数量。不满足条件时伤害暴跌 10²⁰⁺ 倍（如 Unaffiliated 核心配 Affiliated DPS 仅 ~10²⁸%）。

> **量级判断**：满配管道加成在 10³⁹%~10⁵⁸% 级别，远超英雄技能和装备加成（通常 10²%~10⁶%）。这些数值是所有伤害节点基础值 × flow 放大 × Epic Flow × supercharge 的乘积，取决于玩家管道配置（哪些输入连到哪些输出、流量等级），是高度个性化的。

游戏数据中相关谓词（`effect-reference.json`，其中 4 个标记 `serverOnly: true`，12 个 `serverOnly: false`）：

| 谓词 | 语义 |
|---|---|
| `modron_epic_output` / `modron_core_every_output` | Epic / 全输出激活状态 |
| `modron_highest_flow_to_output` / `modron_lowest_flow_to_output` | 最高 / 最低流量 |
| `modron_supercharge_output` / `modron_supercharge_250` | 超载输出 |
| `modron_core_assigned` | 当前绑定的核心 ID |
| `modron_cores_unlocked` / `highest_modron_core_level` | 已解锁核心数 / 最高核心等级 |
| `exclude_from_modron` | 标记不受 Modron 加成影响的效果（如过期药剂） |

> 以上谓词中，`modron_core_assigned`、`modron_components`、`modron_cores_unlocked`、`modron_supercharge_every_output` 为 `serverOnly: true`，其余 12 个为 `serverOnly: false`。本地 planner 不解析任何 modron 谓词，仅作参考。

### 核心等级

核心从 1 级开始，满级 **15 级**（社区确认）。升级条件：绑定核心的探险队完成新区域。每次升级解锁 2 个输出节点，有时附带固定管道，并给予 Modron 部件宝箱。

### 自动化功能

| 功能 | 说明 |
|---|---|
| 自动重置（Auto-reset） | 到达设定层数后自动重置冒险，从第 1 层重新开始，保留全部神恩、宝箱和宝石 |
| 自动阵型（Set Formation） | 指定一个保存阵型，重置后自动恢复 |
| 魔宠自动放置 | 需要 2 个以上魔宠：1 个上场、1 个升级点击伤害，每个英雄另需 1 个 |

核心自动运行 **7 天** 后需要手动检查充能（psychomorphic energy refill），否则停止（社区确认，官方博客）。

### Nordom 互动

Nordom（英雄 100）与 Modron 核心有特殊交互：

- **核心编程**（Core Programming）：根据绑定的核心提供不同条件的全队伤害加成（乘算叠加）。每个核心对应不同条件——谦逊核心按独特种族数、快速核心按速度英雄数、无从属核心按无归属英雄数等（`champion-details/100.json` 中 `nordom_modron_core_active` 8 种变体）。
- **Modron 核心工具箱**（Modron Core Toolbox）：核心经验获取 +20%（`nordom_modron_xp_buff,20`）。
- **伟大的 Modron 之谜**（The Great Modron Puzzle）：根据所有激活核心的已连接输出总数提升「整齐队列」效果（`nordom_great_modron_puzzle_buff`，hero-abilities.json 标注无 parser）。

## 对 planner 评估的影响

本项目 planner 中 Modron 相关代码集中在三处：

1. **重置层数建议**（`src/domain/simulator/modronInfo.ts`）：`MODRON_AUTO_RESET_CAP = 2500`（来自 `game-rules.json` → `max_modron_auto_reset_area.area`），`computeModronResetSuggestion` 取 `min(阵型预估最大层数, 2500)` 作为建议重置层。守护测试在 `gameRulesSync.test.ts` 中验证常量与数据源同步。

2. **Ult 覆盖率折算**（`src/domain/simulator/ultUptime.ts`）：`modronActive` 参数控制是否计入大招 buff——满级核心自动施放时 `uptime = duration / base_cooldown`；未激活则 `uptime = 0`（保守不计）。当前生产调用方均传 `false`（无核心满级假设），实际加成暂未接入评估。

3. **全局 DPS 池**（`src/domain/buffs/blessingGlobalBuff.ts` 注释）：Modron 管道伤害加成与赞助人天赋、祝福共享同一 `global_dps_multiplier_mult` 加法池 `1 + Σ(value)/100`，但当前 planner 未注入 Modron 来源的 multiplier。

> **结论**：Modron 管道加成是阵型外全局乘区，但 planner 当前不建模管道伤害/金币/速度 buff；仅建模了自动重置层数上限和 ult 自动施放假设。

### 接入不可行性分析（2026-08-09 深度调研）

管道加成接入 planner 需要三层前置，当前**均不具备**：

1. **核心定义数据**：每个核心的节点布局（哪些节点、每个节点的基础值/类别）**不在公开 JSON**。`effect-reference.json` 只有 21 个运行时状态谓词（flow 值、激活状态），没有节点→加成值映射表。`game-rules.json` 只有 `max_modron_auto_reset_area` 和 `modron_ui_requirements`，无管道定义。

2. **管道计算引擎**：flow 分配、buff box 回路放大、Epic Flow 判定、supercharge 叠加均为**服务端实时计算**，无公开公式。社区（Gaarawarr）仅描述了 buff box 的定性机制和 supercharge 阈值，没有 flow 分配的精确算法。

3. **存档导入**：`userdetails.modron_saves` 存储玩家管道配置（哪些 pipe 连在哪里），**不存最终加成值**。当前 `userProfileNormalizer.ts` 不提取 modron_saves，`UserProfileSnapshot` 无 modron 字段。即使提取，仍需核心定义数据 + 管道引擎才能推导最终加成。

> **Nordom 核心编程审计**：`nordom_core_programming_buff`（按绑定核心的条件全队 DPS 加成）和 `nordom_great_modron_puzzle_buff`（按已连接输出总数的加成）均标注 No parser，正确地保守跳过——Nordom 的 28 个已解析 carrySignals 全是无条件 `hero_dps_multiplier_mult`（100/200/300，自身基础 DPS 升级），核心编程条件未被误解析为无条件信号，**无 bug**。但核心编程的接入同样依赖 `modron_core_assigned`（serverOnly=true，存档层），属于同一前置缺口。

> **前置依赖**：管道加成接入属于 damage-mechanic-inventory §5D / 里程碑 M2（私有存档导入通道），需先解决 userdetails 导入 + 核心定义数据获取 + 管道计算引擎，复杂度远高于需求文档原估的「simulator 已有数据，边际成本可控」。

## 数据源

| 数据文件 | 字段 | 值 |
|---|---|---|
| `game-rules.json` | `max_modron_auto_reset_area.area` | 2500 |
| `game-rules.json` | `modron_ui_requirements.requirements` | `hero_count_in_seats: {min_seats: 6, count: 2}` |
| `effect-reference.json` | 16 个 `modron_*` 谓词 | 4 个 `serverOnly: true`（`modron_core_assigned`/`modron_components`/`modron_cores_unlocked`/`modron_supercharge_every_output`），12 个 `serverOnly: false`；本地不解析 |
| `hero-abilities.json` | `nordom_great_modron_puzzle_buff` | 标注「No parser」 |
| `champion-details/100.json` | `nordom_modron_core_active` × 8 变体 | Nordom 核心编程，按核心类型切换条件 |
| `champion-details/100.json` | `nordom_modron_xp_buff,20` | Nordom 核心经验 +20% |

`modron_ui_requirements` 表示解锁 Modron UI 需要阵型中至少 6 个座位各有 2 名英雄（即需要足够英雄池深度才能使用多队功能）。

## 验证标注

- **[社区确认]**：核心满级 15、输出加成类别、7 天能量限制、自动化循环细节、核心列表与获取方式——均来自 Fandom Wiki 和 Steam 指南，未在游戏数据 JSON 中找到直接数值字段（管道配置是服务端/存档层数据，不在公开 JSON 中）。
- **[数据验证]**：`max_modron_auto_reset_area = 2500`、`modron_ui_requirements` 条件、Nordom 三个 Modron 交互技能——直接从游戏数据 JSON 读取。
- **[代码验证]**：planner 中三处 Modron 相关代码的实际行为——从源码读取。
- **[未验证]**：各核心具体输出节点的伤害/金币/速度数值——不在公开游戏数据中，需从游戏内截图或社区配置库获取。

## 社区来源

- [Fandom Wiki — Modron Automation](https://idlechampions.fandom.com/wiki/Modron_Automation)
- [Fandom Wiki — Modron Core](https://idlechampions.fandom.com/wiki/Modron_Core)
- [Steam 进阶指南](https://steamcommunity.com/sharedfiles/filedetails/?id=2615977602)
- [Reddit r/idlechampions](https://www.reddit.com/r/idlechampions/comments/hvnz38/)
- [官方博客（7 天能量限制）](http://codenameentertainment.com/?page=blog&post_id=1074)
- [社区核心配置库 Encyclopedia Modronica](https://emmotes.github.io/ic_modron_library/)
