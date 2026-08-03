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

- gain profile 仍计入未注册 stackFunc 信号（实际评分恒丢弃），幻影增益可能挤掉同席位真实候选 <!-- auto-todo:id=atd_ee3eeb96b6 -->
  - 记录时间: `2026-08-03T09:53:22+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/abilityModel.ts:329`
  - 备注: aggregateGainByDimension 计入带未注册 stackFunc 的信号（per_mithral_hall_stacks/get_stat/per_other_stack_count 等，40 信号/33 英雄），但 resolveSignalMultiplier 走 stackFunc 路径找不到 resolver 恒返回 ok:false 丢弃——gain 上界虚高，p50 裁剪可能误留 phantom 强、误裁真强（efficiency-only）。
    - applyManually 同族问题已修（91c839b9：gain 跳过 applyManually 信号）
    - 修需引入 STACK_COUNT_RESOLVERS keys（scorer 注册表，planner 层）到 aggregateGainByDimension（abilities 层），与 abilityModel.ts「不含推荐引擎语义」边界冲突；或把 gain 计算下沉到 planner 层
    - 详见 docs/specs/modules/planner/modeling-pitfalls.md 陷阱 5「镜像丢弃条件」条目

<!-- auto-todo:end -->
