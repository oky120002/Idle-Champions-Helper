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

affiliation 已通过 tag 系统接入 planner——`normalize-champions.ts` 将所有 19 个分组 + `unaffiliated` 转换为 hero tag，planner 的 tag 匹配可直接使用。

### `has_affiliation` 谓词 ⚠️

effect-definitions.json 中有 3 个定义（id 949/1059/1380）使用 `has_affiliation`/`!has_affiliation` 作为 target tag 条件，但这些定义未被任何 champion upgrade 引用（死定义）。实际使用 `has_affiliation` 的只有 Miria (121)，在她的 `buff_upgrade_per_any_tagged_crusader_mult,0,10665,!has_affiliation` 的 count qualifier 中。

`parseHeroPredicate`（heroPredicate.ts）不认识 `has_affiliation`/`!has_affiliation` 谓词。但 Miria 的效果丢失的**根因不是谓词不支持**——而是 `buff_upgrade_per_any_tagged_crusader_mult` wrapper 派生的通用覆盖缺口（8/24 成功，16/24 丢失，涉及 14 种不同 tag 条件）。修复 `has_affiliation` 谓词不能解决 Miria 的效果丢失。
