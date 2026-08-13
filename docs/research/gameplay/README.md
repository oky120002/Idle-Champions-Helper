# gameplay/ —— 游戏实测调研

记录英雄机制、战斗表现等游戏内实测事实，**不含决策**。事实优先，结论紧随。

## 主题入口

- [`champion-mechanics/`](./champion-mechanics/)：英雄 DPS/金币/速度机制实测，配合 planner 英雄参照校准（`docs/specs/modules/planner/champion-reference-verification.md`）
- [`attack-multi-hit.md`](./attack-multi-hit.md)：多段攻击机制——段数计算、数据源与提取方法
- [`armored-enemies.md`](./armored-enemies.md)：护甲敌人机制——碎甲门槛/BUD 判定与专门碎甲能力
- [`enemy-special-health.md`](./enemy-special-health.md)：敌人特殊血量——hits-based/crit-based/segmented 对比
- [`aoe-survival.md`](./aoe-survival.md)：AoE 伤害防御——免疫/减伤/临时生命值/治疗四类机制
- [`bud-mechanics.md`](./bud-mechanics.md)：BUD（基础大招伤害）——定义、衰减规则、与大招/点击的关系
- [`critical-hits.md`](./critical-hits.md)：暴击——基础值、多重暴击、与 BUD/护甲的交互
- [`speed-mechanics.md`](./speed-mechanics.md)：速度机制——冷却缩减、过层加速、Briv 跳层
- [`gold-and-favor.md`](./gold-and-favor.md)：金币与恩宠——掉落公式、5 类来源、9 种永久恩宠
- [`debuff-control-mechanics.md`](./debuff-control-mechanics.md)：减益与控制——击退/眩晕/减速/定身/狂暴机制与英雄盘点
- [`modron-automation.md`](./modron-automation.md)：Modron 自动化——核心/管道加成、自动化功能、planner 影响
- [`potions.md`](./potions.md)：药水系统——六大家族/传奇药水/叠加规则/与 BUD 的关系
- [`familiars.md`](./familiars.md)：熟悉——自动点击/升级/大招/药水的槽位分配、阶梯效果与获取方式
- [`patrons-blessings.md`](./patrons-blessings.md)：赞助人与祝福——5 位赞助人限制规则、Perk 层级、区域加码、两套并行增益系统
- [`progression-systems.md`](./progression-systems.md)：三大进度系统——赛季（已停办）、提亚马特试炼（10 难度异步多人）、时空门（碎片开老英雄）
- [`pushing-and-wall.md`](./pushing-and-wall.md)：推图与墙——怪物血量/伤害缩放公式、三种墙类型、boss 狂怒与压制机制
- [`variant-restriction-catalog.md`](./variant-restriction-catalog.md)：变体限制机制目录——128 种 mechanics 分类与 planner 覆盖现状
- [`clicking-mechanics.md`](./clicking-mechanics.md)：点击伤害——BUD 派生关系、9 个 click 效果族、`click_seconds` 缺口
- [`groups-and-affiliations.md`](./groups-and-affiliations.md)：英雄分组/归属——19 个分组、99/165 英雄有归属、buff 条件依赖
- [`equipment-system-overview.md`](./equipment-system-overview.md)：装备系统总览——稀有度缩放实测（社区倍率矛盾）、Chests/Shiny/Golden Epic
- [`scavenger-collecting.md`](./scavenger-collecting.md)：特殊收集能力——跨冒险持久 buff、3 个 Scavenger 英雄
- [`misc-game-mechanics.md`](./misc-game-mechanics.md)：次要机制合并——Game Modes/Resets/Weekends/Notary/Tokens/Apothecary/大数字缩写

## 来源可信度

社区文档（Reddit、Fandom Wiki、Steam、Gaarawarr 等）是**参考而非权威**。游戏数据（`public/data/v1/`）是唯一事实来源。每篇文档必须标注可信度：

| 标记 | 含义 | 处理方式 |
|---|---|---|
| ✅ 已确认 | 社区说法与游戏数据一致，或游戏数据直接可证 | 保留，可信引用 |
| ⚠️ 待确认 | 仅社区来源，游戏数据无法验证或部分矛盾 | 保留，引用时需注意不确定性 |
| ❌ 已丢弃 | 与游戏数据矛盾 | 删除，不留在文档中 |

文档内每条关键结论也应就地标注。整篇可信度在标题下方集中标注。

## 怎么写

新建文档从 [`_template.md`](./_template.md) 开始。必填项：

- 标题 + **数据快照**日期 + **可信度**标记（✅/⚠️/❌ + 一句说明哪些确认哪些存疑）
- 机制说明（大白话，面向不熟悉细节的读者）
- 数据源（游戏数据文件路径 + 字段名）
- 提取方法（公式 + 注意事项/坑）
- 社区来源（URL 列表，同时登记到 [`../community-source-index.md`](../community-source-index.md)）
- 不写决策（进 `decisions/`）或下一步建议（进 `plans/`）
