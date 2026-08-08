<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- HasEffect/HasEffectByID 布尔谓词未解析：7 个去重表达式(~14 原始实例)，含 2 个评分关键 <!-- auto-todo:id=atd_6f71fd37c3 -->
  - 记录时间: `2026-08-08T13:27:44+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:138-238`
  - 备注: 2026-08-08 深度复核修正：TODO 原说 4 个，实际 7 个去重表达式（含 HasEffectByID 漏报） - 评分关键实例：Skylla(169) HasEffectByID(2474) 门控 hero_dps_multiplier_mult,400(+400% DPS)；Knox(82) HasEffect(celeste_heal) 门控 damage_reduction,25(25%减伤) - 其余：Cazrin(166) 复合条件含 HasEffectByID(2416)、Alyndra(77) HasEffect、Kas(153) !HasEffect、Trixie(176) do_nothing(无影响) - 37 unparsed 中其余 ~30 个是数值表达式(floor/min/max/属性引用)和不支持的函数(num_applied_pigments/AverageILevels)，非谓词类型

- 评估页（PlannerEvaluatePage）接入金币预算控件 <!-- auto-todo:id=atd_46f647cf66 -->
  - 记录时间: `2026-08-07T23:32:27+08:00`
  - 类型: follow-up
  - 位置: `src/pages/planner/PlannerEvaluatePage`
  - 备注: 金币预算计划（2026-08-planner-gold-budget-integration）归档时留的后续增强：推荐页已有金币/等级互斥控件，评估页尚未接入，可复用 PlannerGoldLevel 组件 + runner.convertGoldLevel

- Modron 管道 buff 数值未进 planner 评分 <!-- auto-todo:id=atd_4ca7841bda -->
  - 记录时间: `2026-08-08T12:56:14+08:00`
  - 类型: optimization
  - 位置: `src/domain/simulator/modronInfo.ts`
  - 备注: modronInfo.ts/ultUptime.ts/blessingGlobalBuff.ts 三处消费 modron 数据，但管道(齿轮)的伤害/金币/速度 buff 数值未建模。- 影响：planner 推荐不反映 modron 管道加成- 证据：modron-automation.md 调研，effect-reference.json 中 16 个 modron_* 谓词均 serverOnly

- 取反复合对齐标记（!lawful_good）不展开 De Morgan——forbidden 位置保持字面量 <!-- auto-todo:id=atd_f24a57fc7f -->
  - 记录时间: `2026-08-08T22:05:12+08:00`
  - 类型: issue
  - 位置: `scripts/data/normalize-adventures.ts:816`
  - 备注: 取反复合对齐标记（如 !lawful_good）不展开 De Morgan（forbidden 位置复合标记保持字面量，因无英雄持有 lawful_good 标记故恒 vacuously true=不排除任何人）。当前全库 0 实例触发，仅理论边界。
    - 影响：!lawful_good 应排除守序善良英雄，当前不排除任何人（forbidden:lawful_good 无英雄匹配）
    - 证据：parseAtom 取反分支直接 slice(1) 不查 COMPOUND_ALIGNMENT_TAGS；修复需 De Morgan 展开（!lawful_good → forbidden:lawful OR forbidden:good 两子句）
    - 优先级：低（0 实例触发）

<!-- auto-todo:end -->
