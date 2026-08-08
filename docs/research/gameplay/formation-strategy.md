# 阵型策略与站位机制（Formation Strategy）

**数据快照**：2026-08-08（165 英雄 / 161 个阵型布局）
**可信度**：✅ 已确认——阵型布局、位置关系定义与信号数据均可从游戏数据直接验证；站位策略建议来自社区共识。

**社区来源**：
- [Formations 101 — Reddit r/idlechampions](https://www.reddit.com/r/idlechampions/comments/dqe878/formations_101_an_introduction/)
- [Formation Strategy — Fandom Wiki](https://idlechampions.fandom.com/wiki/Formation_strategy)
- [Optimal Formations — Steam Community](https://steamcommunity.com/sharedfiles/filedetails/?l=german&id=1319319295)

## 机制

### 阵型布局

每个冒险关联一个阵型布局，定义了可放置英雄的格子及其空间关系。

- 阵型由 **列** 和 **行** 构成的二维网格组成。
- 列从后往前编号：**列 1 = 最后方**（离敌人最远），**最大列号 = 最前方**（离敌人最近，坦克位）。
- 161 个阵型布局中，10 槽布局占 156 个（主流），9 槽 / 11 槽 / 13 槽各为少数特殊冒险。
- 列数范围 3-6 列，行数范围 4-7 行；常见为 4-5 列 × 5-7 行。

每个格子存储以下属性（`formations.json` → `slots[]`）：

| 字段 | 含义 |
|---|---|
| `id` | 格子标识（如 `s1`） |
| `column` | 所在列号（数字越大越靠近敌人） |
| `row` | 所在行号（纵向位置） |
| `x` / `y` | 渲染坐标 |
| `adjacentSlotIds` | **物理相邻**的格子 ID 列表 |

### 位置关系

位置关系是位置条件效果的核心判据。类型系统定义 30 种位置关系，其中 **21 种实际出现在信号数据中**，覆盖 224 条含显式位置约束的英雄信号（占全部 8320 条信号的约 2.7%，其余位置约束为 `any` 即全局）。高频关系如下：

| 关系 | 信号数 | 含义 |
|---|---|---|
| `adjacent` | 46 | 仅影响物理相邻格子（共享边或角）的英雄 |
| `aheadColumn` | 26 | 仅影响前方一列（更靠近敌人）的英雄 |
| `withinTwoSlots` | 18 | BFS 距离 1-2 步以内的英雄 |
| `sameColumn` | 17 | 同列英雄 |
| `sameOrBehindColumn` | 17 | 同列或后方一列 |
| `behindTwoColumns` | 16 | 后方两列以内的英雄 |
| `allBehindColumns` | 16 | 所有更靠后的列 |
| `nonAdjacent` | 12 | 不相邻的英雄 |
| `behindColumn` | 10 | 后方一列的英雄 |

其余关系包括 `adjacentOrSelf`、`adjacentColumns`（左右相邻两列）、`frontTwoColumns`/`backTwoColumns`（最前/最后两列）、`rearMostColumn`（最后列）、`withinTwoSlotsOrSelf` 等边缘变体。

**距离计算**：相邻关系基于阵型布局的 `adjacentSlotIds`，通过 BFS 计算最短格子距离。例如 `withinTwoSlots` 要求 BFS 距离为 1 或 2（不含自身）。

**列方向计算**：`delta = 目标列号 − 来源列号`，正值表示目标更靠前（靠近敌人），负值更靠后。

### 位置条件效果如何触发

英雄的增益信号在 `hero-abilities.json` 中通过 `positionQualifier.relation` 字段声明位置约束。评分引擎在计算某个支援英雄对输出的增益时，会检查两者的位置关系是否满足信号声明的关系——不满足则该信号不生效。

### 站位策略

社区公认的站位原则：

1. **坦克放最前方**（最大列号）：坦克英雄拥有高血量和减伤能力，承担敌人攻击；部分坦克还有"前方位置"或"身后有英雄"的条件增益。
2. **主力输出放中后排**（2-3 列）：输出英雄通常不需要直接承伤，放在中间列便于接收来自多方向辅助的增益。
3. **辅助围绕输出站位**：大量增益信号要求相邻或同列，辅助英雄必须放在输出旁边才能使增益生效。
4. **注意"不相邻"约束**：少数英雄（如 Makos 的 Dark Blessing）要求仅与不超过 N 个英雄相邻，需要安排在角落格子。
5. **同列增益链**：如 Bruenen 的同列增益，需要将辅助和输出放在同一列以最大化效果。

## 数据源

| 数据 | 文件 | 字段 |
|---|---|---|
| 阵型布局 | `public/data/v1/formations.json` | `items[].slots[]`（`column`、`row`、`adjacentSlotIds`） |
| 位置条件信号 | `public/data/v1/hero-abilities.json` | 每条信号的 `positionQualifier.relation` |
| 位置关系类型定义 | `src/domain/abilities/abilityModel.ts:31` | `HeroPositionRelation`（30 种联合类型） |
| IC 原始 target 映射 | `src/domain/abilities/heroTargetingRelation.ts` | `STRING_RELATION_MAP`（游戏 `targets` 字符串 → 关系枚举） |
| 位置关系计算逻辑 | `src/domain/planner/placementSlotRelation.ts` | `matchesSlotRelation()`（相邻/距离/列方向判定） |

## 提取方法

位置关系已在数据管线中预解析，无需二次计算：

1. 阵型布局：`formations.json` 每个 `slot` 直接声明 `column`、`row` 和 `adjacentSlotIds`，由冒险关联决定当前阵型。
2. IC 原始 target → 关系枚举：`heroTargetingRelation.ts` 的 `STRING_RELATION_MAP` 将游戏原始字符串（如 `adj`、`col`、`next_col`、`behind`）映射为 `HeroPositionRelation`；对象形式（`{type:"distance", distance:2}`、`{type:"exactly_x_behind", num_columns:1}`）由 `normalizeObjectRelation()` 处理。
3. 评分期校验：`placementSlotRelation.ts` 的 `matchesSlotRelation()` 在 planner 评估每个支援→输出增益对时，按 BFS 距离（相邻类）或列差值（列类）判定位置关系是否满足。

注意：尽管阵型布局有行信息，**游戏中不存在基于"同排"的位置条件效果**——所有位置关系均基于相邻距离或列方向，行仅用于渲染定位。

## 社区来源

- [Formations 101 — Reddit r/idlechampions](https://www.reddit.com/r/idlechampions/comments/dqe878/formations_101_an_introduction/)——阵型术语定义（格子、列、行、相邻），含 Calliope Song of Protection 距离示例
- [Formation Strategy — Fandom Wiki](https://idlechampions.fandom.com/wiki/Formation_strategy)——基于 12 基础英雄的阵型推演，含坦克/输出/辅助分工
- [Optimal Formations — Steam Community](https://steamcommunity.com/sharedfiles/filedetails/?l=german&id=1319319295)——活动与常驻战役的推荐阵型（9/10 人阵型图）
