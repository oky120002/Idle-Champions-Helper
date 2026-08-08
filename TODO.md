<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- HasEffect 布尔谓词未解析，含它的 per_hero_expr 整体保守丢弃（数据流缺口） <!-- auto-todo:id=atd_d957df0b59 -->
  - 记录时间: `2026-07-21T10:17:41+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:123`
  - 备注: 当前唯一未解析的存档依赖**布尔**谓词 = HasEffect（NumEffectKey/DefHasTag 真实数据 0 实例）。A①②③（`53ad9a6b`/`5ac32e4f`/`ea117797`）已落地 GetUpgradeUnlocked/GetUpgradePurchased/GetFeatEquipped/is_alive/EligibleForPatron 五族。
    - 证据：signal-coverage 实测 85 个去重 per_hero_expr，50 已解析、35 未解析；35 中仅 HasEffect 约 4 实例（`!HasEffect(vampire_spawn)`×2、`HasEffect(alyndra_portented_v2)`、`HasEffect(celeste_heal)&&hero_id==82`）属布尔谓词丢弃，其余全为数值表达式（stage 7 叠层计算，本不解析为谓词）
    - 影响：含 HasEffect 的 per_hero_expr 整体 null → formationCountQualifier 退化为 null/filterQualifier，stack 数量可能高估（仅 4 实例，影响面小）
    - 关联：expression-evaluator.md；HasEffect 属阵型运行时另案（effect 跨英雄共享，count qualifier 对全阵型求值致 cross，需 effect 作用图 + 迭代求值）
    - 处置：effect 作用图基建后补 HasEffect 节点 + profile context 求值

- buff_upgrade wrapper per_hero_expr 是否需传播到 base qualifier（B 域 wrapper 语义） <!-- auto-todo:id=atd_36c2b3111c -->
  - 记录时间: `2026-08-02T16:45:10+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/equipmentBuffSignals.ts:64`
  - 备注: A①②③ 期间发现：hero 119 (buff_upgrade,25,19676 is_alive) / hero 175 (buff_upgrades 英雄之兰) 的 per_hero_expr 已可解析，但 buff_upgrade wrapper 设计上 formationCountQualifier=null（buildEquipmentBuffWrapper + build 期 preset effect-helpers.ts:777-792），wrapper 放大 base 时继承 base targeting、自身不携带 count qualifier。
    - 处置：需确认 wrapper 自身 per_hero_expr 是否应覆盖/扩展 base targeting（base upgrade 19676/19356 的 targeting 是否充分）。属 B 域 wrapper 语义，非谓词解析问题。

- planner 筛选限制审计——确认模拟器不内嵌 patron/拥有状态等限制 <!-- auto-todo:id=atd_3a104afb9d -->
  - 记录时间: `2026-08-06T15:18:43+08:00`
  - 类型: follow-up
  - 备注: Patron 过滤功能开发中确立的架构原则
    - 原则：planner 是纯计算引擎，入参什么算什么，不内嵌筛选/限制逻辑
    - 任务：审计 planner 是否有不该有的限制（patron 资格、英雄拥有状态等），如有则移到外部入参构建
    - 背景：champion filter 层做限制，planner 不碰；用户在 Patron 过滤功能中明确要求

- 评估页（PlannerEvaluatePage）接入金币预算控件 <!-- auto-todo:id=atd_46f647cf66 -->
  - 记录时间: `2026-08-07T23:32:27+08:00`
  - 类型: follow-up
  - 位置: `src/pages/planner/PlannerEvaluatePage`
  - 备注: 金币预算计划（2026-08-planner-gold-budget-integration）归档时留的后续增强：推荐页已有金币/等级互斥控件，评估页尚未接入，可复用 PlannerGoldLevel 组件 + runner.convertGoldLevel

- allowedTags 复合表达式 AND(^) 语义未处理 <!-- auto-todo:id=atd_77cdaabdd1 -->
  - 记录时间: `2026-08-08T12:55:59+08:00`
  - 类型: bug
  - 位置: `src/domain/planner`
  - 备注: planner 仅按 |(OR) 拆分 allowedTags，如 (chaotic^good) 或 !small^!dwarf^!gnome 的 AND 组合会被误判。- 影响：含复合标签限制的变体会选入不合格英雄- 证据：variant-restriction-catalog.md 调研发现，57 个属性门槛变体相关

- 变体属性门槛(INT/CHA/STR/CON/DEX/WIS)完全未结构化 <!-- auto-todo:id=atd_83446e06cd -->
  - 记录时间: `2026-08-08T12:56:06+08:00`
  - 类型: issue
  - 位置: `public/data/v1/variants.json`
  - 备注: 57 个变体含能力分数门槛(常见≥13或≤14)，仅存于 restrictions 文本，planner 不消费。- 影响：带属性限制的变体下，planner 会选入不合格英雄- 证据：variant-restriction-catalog.md jq 全集统计

- Modron 管道 buff 数值未进 planner 评分 <!-- auto-todo:id=atd_4ca7841bda -->
  - 记录时间: `2026-08-08T12:56:14+08:00`
  - 类型: optimization
  - 位置: `src/domain/simulator/modronInfo.ts`
  - 备注: modronInfo.ts/ultUptime.ts/blessingGlobalBuff.ts 三处消费 modron 数据，但管道(齿轮)的伤害/金币/速度 buff 数值未建模。- 影响：planner 推荐不反映 modron 管道加成- 证据：modron-automation.md 调研，effect-reference.json 中 16 个 modron_* 谓词均 serverOnly

<!-- auto-todo:end -->
