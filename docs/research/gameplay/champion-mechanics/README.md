# champion-mechanics/ —— 英雄机制实测

一英雄一份调研 `<heroId>.md`，记录游戏内 DPS/金币/速度机制的完整实测，配合 `src/domain/planner/references/<heroId>ReferenceData.ts`（typed 测试字段）双向关联。

## 当前记录

- [`vi-95.md`](./vi-95.md)：蔚（hero_id=95）—— formation-count-mult-stack + dynamic-stack-multiply + bonus-scale-linkage + buff-upgrade-modifier 四机制交汇样例

## 关联

- 规范：`docs/specs/modules/planner/champion-reference-verification.md`（校准口径）
- 注册表：`docs/specs/modules/planner/dps-mechanics.md`（机制 id）
- 新增/修正参照操作：`docs/runbooks/add-champion-reference.md`
