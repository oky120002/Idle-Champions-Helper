# champion-mechanics/ —— 英雄机制实测

一英雄一份调研 `<heroId>.md`，记录游戏内 DPS/金币/速度机制的完整实测，配合 `src/domain/planner/references/<heroId>ReferenceData.ts`（typed 测试字段）双向关联。

一英雄一份调研 `<3位补零heroId>-<name>.md`（编号前置便于排序），记录游戏内 DPS/金币/速度机制的完整实测，配合 `src/domain/planner/references/<heroId>ReferenceData.ts`（typed 测试字段）双向关联。

## 当前记录

- [`095-vi.md`](./095-vi.md)：蔚（hero_id=95）—— formation-count-mult-stack + dynamic-stack-multiply + bonus-scale-linkage + buff-upgrade-modifier 四机制交汇样例
- [`007-minsc.md`](./007-minsc.md)：明斯克（hero_id=7）—— carry（输出/速度），偏好敌人 vulnerability + 直吹自擂速度核心；单人 1/722 级 + 明斯克×瓦罗阵型伤害快照
- [`159-varo.md`](./159-varo.md)：瓦罗（hero_id=159）—— support，战斗指南交叉位置 buff + 指南系列乘算堆叠；单人 1/558 级 + 明斯克×瓦罗阵型伤害快照

## 关联

- 规范：`docs/specs/modules/planner/champion-reference-verification.md`（校准口径）
- 注册表：`docs/specs/modules/planner/dps-mechanics.md`（机制 id）
- 新增/修正参照操作：`docs/runbooks/add-champion-reference.md`
