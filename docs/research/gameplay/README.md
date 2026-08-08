# gameplay/ —— 游戏实测调研

记录英雄机制、战斗表现等游戏内实测事实，**不含决策**。事实优先，结论紧随。

## 主题入口

- [`champion-mechanics/`](./champion-mechanics/)：英雄 DPS/金币/速度机制实测，配合 planner 英雄参照校准（`docs/specs/modules/planner/champion-reference-verification.md`）
- [`attack-multi-hit.md`](./attack-multi-hit.md)：多段攻击机制——段数计算、数据源与提取方法
- [`armored-enemies.md`](./armored-enemies.md)：护甲敌人机制——碎甲策略与专门碎甲能力
- [`aoe-survival.md`](./aoe-survival.md)：AoE 伤害防御——免疫/减伤/临时生命值/治疗四类机制

## 怎么写

- 标题 + 数据快照日期（游戏版本/观察日期）
- 原话、截图描述、机制分析、推导与偏差分析
- 数据缺口显式标注（与参照 `mock` 字段对应）；用户补实测后移除
- 不写决策（进 `decisions/`）或下一步建议（进 `plans/`）
