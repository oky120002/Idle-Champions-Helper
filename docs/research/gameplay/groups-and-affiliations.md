# 英雄分组与归属（Groups / Affiliations）

**数据快照**：2026-08-10（champions.json，165 英雄）
**社区来源**：[Fandom Wiki: Groups](https://idlechampions.fandom.com/wiki/Groups)、[Fandom Wiki: Category:Groups](https://idlechampions.fandom.com/wiki/Category:Groups)、[Reddit: Affiliations ranked](https://www.reddit.com/r/idlechampions/comments/1nph60b/affiliations_ranked_an_underexplained_list/)
**可信度**：✅ 已确认 — 分组数据由 `champions.json` 直证（99/165 英雄有归属），wiki 分组列表与数据一致

## 机制

Groups（也叫 Affiliations）是英雄的背景归属——一群经常一起冒险的英雄。英雄可以无归属（Unaffiliated）、属于一个分组、或同时属于两个分组。

### 为什么对 planner 重要

部分英雄的 buff 条件依赖 affiliation。例如：

- **Rosie**：「C-team, Acquisitions Incorporated, or Waffle Crew affiliations」的英维增加 Sassy 效果 ✅ 数据确认
- **Hank**：基于所有 Scavenger 能力收集的物品数增强 Stalwart Encouragement ✅ 数据确认

affiliation 作为 buff 条件标签时，功能上与 race/class/tag 等筛选维度平行。

## 数据源

### champions.json（165 英雄）

| 字段 | 位置 | 说明 |
|---|---|---|
| `affiliations` | `champions.json` → `items[].affiliations` | 数组，每项 `{original, display}`；空数组 = 无归属 |

### 19 个分组分布

| 分组 | 英雄数 | 分组 | 英雄数 |
|---|---|---|---|
| Heroes of Baldur's Gate | 10 | The Fallbacks | 5 |
| Absolute Adversaries | 9 | Companions of the Hall | 5 |
| Heroes of the Planes | 7 | Heroes of Aerois | 5 |
| Black Dice Society | 7 | Force Grey | 5 |
| Acquisitions Incorporated | 7 | Awful Ones | 4 |
| Rivals of Waterdeep | 6 | Acq Inc "C" Team | 4 |
| Saturday Morning Squad | 6 | Heroes of the Lance | 4 |
| Oxventurers Guild | 6 | Sirens of the Realms | 3 |
| | | Brimstone Angels | 3 |
| | | Waffle Crew | 3 |
| | | Dark Order | 3 |

- **99/165 英雄有归属**（60%），66 个无归属（Unaffiliated）
- wiki Category:Groups 列出的分组名与数据中 `original` 字段一致

## 与 planner 的关系

affiliation 在 hero-abilities 中作为 buff 的 filter/target 条件出现（如 Rosie 的 affiliation-based buff）。当前评估模型中 affiliation 作为 per-hero 属性可用于条件匹配，但未作为独立维度建模。如需精确模拟 affiliation-dependent buff，需要将 `champions.json` 的 affiliations 接入英雄属性查询。
