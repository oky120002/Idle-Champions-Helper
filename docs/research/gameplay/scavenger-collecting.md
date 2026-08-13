# 特殊收集能力（Scavenger / Special Collecting Abilities）

**数据快照**：2026-08-10（hero-abilities.json）
**社区来源**：[Fandom Wiki: Special collecting abilities](https://idlechampions.fandom.com/wiki/Special_collecting_abilities)、[Fandom Wiki: Category:Scavengers](https://idlechampions.fandom.com/wiki/Category:Scavengers)
**可信度**：⚠️ 待确认 — 效果存在于游戏数据但全部 No parser；机制描述来自社区

## 机制

Scavenger（拾荒者）是部分英雄拥有的特殊能力：击败 boss 时自动收集特定物品。收集的物品在冒险间持久保留（跨冒险 stacks），为英雄提供永久加成。

### 核心规则（社区来源）

- 某些英雄在击败 boss 时自动收集特定类型物品（如 Tiamat 拾荒者、腐化宝石拾荒者）
- 收集上限基于英雄发布以来的天数（daily cap）
- Hank 的能力「Stalwart Encouragement」效果增加 10% per ever collected item（所有 Scavenger 收集物品总数，加性叠加）
- 收集的物品在冒险间持久保留，不会因重置而丢失

### 已知 Scavenger 英雄（hero-abilities.json 直证）

| rawEffect | 英雄 | 说明 |
|---|---|---|
| `presto_component_scavenger` | Presto | 组件拾荒者 |
| `jangsao_star_collector` | Jang Sao | 星之收集者 |
| `strongheart_event_token_scavenger` | Strongheart | 事件代币拾荒者 |

> 以上 3 个效果在 hero-abilities.json 中全部标记为 "No parser"，即未进入评估模型。

### wiki 提到的其他 Scavenger 类型

- Tiamat Scavenger（提亚马特拾荒者）
- Corrupted Gem Scavenger（腐化宝石拾荒者）
- 具体英雄名需进一步查证 wiki 页面

## 数据源

| 字段 | 位置 | 说明 |
|---|---|---|
| `rawEffect: presto_component_scavenger` | `hero-abilities.json` | Presto 的拾荒能力，No parser |
| `rawEffect: jangsao_star_collector` | `hero-abilities.json` | Jang Sao 的星之收集，No parser |
| `rawEffect: strongheart_event_token_scavenger` | `hero-abilities.json` | Strongheart 的事件代币拾荒，No parser |

## 与 planner 的关系

Scavenger 系统当前完全未建模（全部 No parser）。跨冒险持久 buff 在静态数据中不可表达（依赖运行时收集历史）。如需建模，需要引入 "collected items" 作为 per-user 状态输入，类似 manualStackCount 的标量假设入参。当前优先级低——Scavenger 加成在 DPS 总量中占比有限。
