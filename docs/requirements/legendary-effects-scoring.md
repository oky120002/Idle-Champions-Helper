# 传奇装备效果评分接入

**优先级**：待评

## 是什么

将传奇装备效果接入 planner 评分管线。`UserProfileSnapshot` 已预留 `legendaryEffects`（候选池）/ `legendaryBySlot`（按槽激活）/ `legendaryLevelCap`（等级上限）字段位，生产代码 `scoringBonusInputs.ts` 与 `recommendationEngine.ts` 对 legendary 零消费，`buildHeroModels` 过滤外部装备源时一并把 legendary 排除在 scored profile 之外——是当前最大未接入加成源。

数据量：每英雄 6 槽 × 165 英雄 = 990 条；两类效果——全队伤害加成（`global_dps_multiplier_mult`，499 条）与特定英雄伤害加成（`hero_dps_multiplier_mult`，491 条）；约 39% 带 `per_crusader` 条件叠加。信号格式与基础能力一致，可直接复用现有 effect 解析管线。哪些激活由玩家存档决定（`legendaryEffects` 为候选池，玩家通过提亚马特鳞片在熔铸中逐级解锁，等级上限 20）。

## 为何暂缓

loot 装备源此前因「无条件烘进 hero-abilities.json 与 owned 通道双重计数」被 `buildHeroModels` 过滤收口（见 `loot-effects-double-counting` 决策），legendary 同属外部装备源被一并排除。接入前须先确认 legendary 是否也存在 baked-in 路径，避免重蹈双重计数；等级缩放曲线（等级上限 20 的逐级 amount）与 `per_crusader` 条件叠加的 count 求值需复用现有装备五通道与 stack 机制，不得另建管线。

## 技术考量

- 复用装备五通道（`globalDps` / `heroDps` unified 池加法），不引入新评分通道
- `per_crusader` 条件叠加复用现有 count 机制（`REGISTERED_STACK_FUNCS` / `aggregateGain`）
- 激活判定依赖存档 `legendaryEffects` / `legendaryBySlot` 字段（无存档时按假设配置同构处理，参考装备 `synthesizeHypotheticalLootByHero`）
- 等级缩放（等级上限 20）需确认逐级曲线后接入

## 关联

- [planner-capability-extensions.md](./planner-capability-extensions.md)（planner 能力扩展总览，本提案属「未建模加成源补建」子项）
- [equipment-and-abilities.md](../research/data/planner/equipment-and-abilities.md)（装备 / 传奇理论基线已全量纳入，未按玩家存档裁剪）
- [damage-bonus-sources.md](../research/data/planner/damage-bonus-sources.md)（legendary 标记「未接入」）
- `CONTEXT.md` § 传奇装备（领域定义：独立于 loot 的附加加成层，等级上限 20）
