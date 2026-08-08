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
