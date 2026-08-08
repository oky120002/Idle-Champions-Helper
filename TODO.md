<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- buff_upgrade wrapper per_hero_expr 是否需传播到 base qualifier（B 域 wrapper 语义） <!-- auto-todo:id=atd_36c2b3111c -->
  - 记录时间: `2026-08-02T16:45:10+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/equipmentBuffSignals.ts:64`
  - 备注: A①②③ 期间发现：hero 119 (buff_upgrade,25,19676 is_alive) / hero 175 (buff_upgrades 英雄之兰) 的 per_hero_expr 已可解析，但 buff_upgrade wrapper 设计上 formationCountQualifier=null（buildEquipmentBuffWrapper + build 期 preset effect-helpers.ts:777-792），wrapper 放大 base 时继承 base targeting、自身不携带 count qualifier。
    - 处置：需确认 wrapper 自身 per_hero_expr 是否应覆盖/扩展 base targeting（base upgrade 19676/19356 的 targeting 是否充分）。属 B 域 wrapper 语义，非谓词解析问题。

- HasEffect/HasEffectByID 布尔谓词未解析：7 个去重表达式(~14 原始实例)，含 2 个评分关键 <!-- auto-todo:id=atd_6f71fd37c3 -->
  - 记录时间: `2026-08-08T13:27:44+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:138-238`
  - 备注: 2026-08-08 深度复核修正：TODO 原说 4 个，实际 7 个去重表达式（含 HasEffectByID 漏报） - 评分关键实例：Skylla(169) HasEffectByID(2474) 门控 hero_dps_multiplier_mult,400(+400% DPS)；Knox(82) HasEffect(celeste_heal) 门控 damage_reduction,25(25%减伤) - 其余：Cazrin(166) 复合条件含 HasEffectByID(2416)、Alyndra(77) HasEffect、Kas(153) !HasEffect、Trixie(176) do_nothing(无影响) - 37 unparsed 中其余 ~30 个是数值表达式(floor/min/max/属性引用)和不支持的函数(num_applied_pigments/AverageILevels)，非谓词类型

<!-- auto-todo:end -->
