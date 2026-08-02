<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- per_hero_expr 存档依赖布尔谓词 17 个被整体丢弃（数据流缺口） <!-- auto-todo:id=atd_d957df0b59 -->
  - 记录时间: `2026-07-21T10:17:41+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:114`
  - 备注: parseHeroPredicate 对 HasEffect/GetUpgradeUnlocked/GetFeatEquipped/GetUpgradePurchased/NumEffectKey/EligibleForPatron/is_alive/DefHasTag 等存档依赖布尔谓词返回 null，含它们的 per_hero_expr 整体保守丢弃。
    - 影响：这些 signal 的 formationCountQualifier 退化为 null/filterQualifier，stack 数量可能高估；raw 164 个去重 per_hero_expr 中 17 个（10.4%）受影响
    - 关联：expression-evaluator.md，需 profile context（装备/专长/effect 状态）
    - 处置：随 numericExpression 落地补存档依赖布尔节点 + profile context 求值

- loot/feat 源 buff_upgrade target 专精的 owned-aware 接入（a ✅ + b ✅ + c-loot ✅；剩余 c-feat + vulnerability 扩展） <!-- auto-todo:id=atd_b1e5f3a2c7 -->
  - 记录时间: `2026-08-01T23:55:00+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/equipmentBuffSignals.ts` + `scripts/data/specialization-catalog.ts`
  - 备注: a 止血 overcount（78820cfb，wrapper 100→16）；b 给 spec catalog signal 加 upgradeId（collectSpecializationEffectEntries 路径，125 direct signal）；c-loot 自动——owned loot buff_upgrade target spec（heroDps/crit/health/gold）经 collectEquipmentBuffsByHero + applyEquipmentBuffsToProfile 反查 spec base 接入（engine 顺序 spec→equipment 保证 spec signal 先注入；反查逻辑单测覆盖）。
    - 剩余：①feat 源 target spec 无通道（featCatalog 按 DIMENSION_BY_KIND 过滤不收 buff_upgrade wrapper），需 feat wrapper 通道（更大工程）；②vulnerability/damageReduction/attackSpeed/cooldown spec 的 loot wrapper 不接入（SUPPORTED_BUFF_TARGET_KINDS 只含 DPS/gold/crit/health），需扩展 SUPPORTED。Minsc spec 109 vulnerability +275 即属此类（仍「没算」）。
    - 验证：384 planner/buffs/abilities + 11 specialization-catalog 测试全绿；signal-coverage gate + schema 校验通过。
    - 原分析订正：ability 源 sourceBucket='ability' 不被 progression-exclusion 排除（isAbilitySource 只含 upgrade/upgrade-effect-key），保留进 catalog 正确（ADR 0017）；Minsc(7) 实测 upgrade 源 +200% 被排除（IC snapshot 已含）、loot/feat 源移出。

<!-- auto-todo:end -->
