# gameplay/ —— 游戏实测调研

记录英雄机制、战斗表现等游戏内实测事实，**不含决策**。事实优先，结论紧随。

## 主题入口

- [`champion-mechanics/`](./champion-mechanics/)：英雄 DPS/金币/速度机制实测，配合 planner 英雄参照校准（`docs/specs/modules/planner/champion-reference-verification.md`）

## 怎么写

- 标题 + 数据快照日期（游戏版本/观察日期）
- 原话、截图描述、机制分析、推导与偏差分析
- 数据缺口显式标注（与参照 `mock` 字段对应）；用户补实测后移除
- 不写决策（进 `decisions/`）或下一步建议（进 `changes/`）
