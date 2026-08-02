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

- planner.css 剩余交织块未完全拆分（scenario-selection + result-card + save-preset） <!-- auto-todo:id=atd_7a3f1c9d2e -->
  - 记录时间: `2026-07-30T15:40:00+08:00`
  - 类型: optimization
  - 位置: `src/styles/pages/planner.css`
  - 备注: 双主题 CSS 审计（ff92e425..69323cad）发现 planner.css 633 行超 pages 体量预算「>520 必须拆」。本次已拆出自包含的 breakdown / scoring-mode / stack-count 到 pages/planner/{breakdown,controls}.css，planner.css 降到 445 行（仍处「应拆」381-520）。
    - 剩余 scenario-selection + result-card + save-preset 三块约 400 行，经 13 组跨块共享逗号选择器深度交织，且有 8 个跨范围重复选择器（如 .planner-result-card__placement 在 67/181/367），级联顺序敏感，强拆会改级联。
    - 处置：低优先级，当前 445 行可接受；待 scenario-selection 或 result-card 单块演进显著时，先抽 12 组跨块共享原语（panel 背景、muted 文本、label/pill/list 样式）到 pages/planner/panels.css，再按块拆 scenario-selection.css / result-card.css / save-preset.css。

- 专精选择面板对级联型专精树不尊重依赖链（hero 165/55/81 what-if 可能产生游戏不可能组合） <!-- auto-todo:id=atd_7c4a2e9b01 -->
  - 记录时间: `2026-07-30T13:30:00+08:00`
  - 类型: follow-up
  - 位置: `src/pages/planner/specializationSelection.ts:groupSpecializationsByTier`
  - 备注: ADR 0017 UI 输入层按 requiredLevel 分层、每层单选，假设「同 requiredLevel = 同互斥组」。hero 165/55/81 是级联型专精树：依赖层（如 165 lvl=150 的 24 选项）各自 requiredUpgradeId 指向上层某个选择，UI 把依赖层全平铺成单选、且改上层后 applyTierSelection 不重置下层 → what-if override 可能保留游戏不可能的组合（如 lvl70=Tyr 但 lvl150 选了要求 Moradin 的项）。仅影响面板 override 探索（3 英雄）；核心推荐用存档 specialization_choices（游戏保证合法），不受影响。
    - （按 requiredLevel 分层，无 requiredUpgradeId 依赖链）
    - 处置：低优先级；依赖感知 UI 需 catalog 带 requiredUpgradeId + 渲染时禁用/过滤未满足前置的依赖层选项（或改上层时清孤立的下游选择）。YAGNI：仅 3 英雄 what-if 探索场景，暂不展开。

- equipmentAdjustment 支持位 loot 未调整 + hero_dps/buff_upgrade loot 不收（UI 已接线，近似仍存） <!-- auto-todo:id=atd_3cb8df390e -->
  - 记录时间: `2026-07-31T22:11:10+08:00`
  - 类型: follow-up
  - 位置: `src/domain/planner/steadyStateScoring.ts:335`
  - 备注: 原 atd_4410248f38 备注「stage 15 UI 接线前需重审」已部分过期——UI 已接线（PlannerEvaluatePage.tsx:90 + usePlannerPageModel.ts:61 计算 equipmentAdjustmentByHero 并传入）。结构性局限仍然成立：
    - 影响①：carryDps 的 sharedPools 聚合所有英雄 global_dps loot，支持位装备贡献从不缩放
    - 影响②：theoreticalLootMult/ownedEquipMult 只收 global_dps_multiplier_mult（692 条），不收 hero_dps（160）和 buff_upgrade（2088）loot；equipmentMult.ts:13-17 注释明确 MVP 范围只接 hero_dps_multiplier_mult
    - 当前死码（?? 1 默认）已活，非阻塞；近似后果（支持位 loot 未调整）未在 docs/research/data/planner/equipment-and-abilities.md 显式记录
    - 处置：待 owned 装备精化时再评估是否重构 damage pool 按 owned loot 逐英雄裁剪（替换 per-carry 整体缩放近似）；当前降低优先级

- loot/feat 源 buff_upgrade target 专精的 owned-aware 接入（a ✅ + b ✅ + c-loot ✅；剩余 c-feat + vulnerability 扩展） <!-- auto-todo:id=atd_b1e5f3a2c7 -->
  - 记录时间: `2026-08-01T23:55:00+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/equipmentBuffSignals.ts` + `scripts/data/specialization-catalog.ts`
  - 备注: a 止血 overcount（78820cfb，wrapper 100→16）；b 给 spec catalog signal 加 upgradeId（collectSpecializationEffectEntries 路径，125 direct signal）；c-loot 自动——owned loot buff_upgrade target spec（heroDps/crit/health/gold）经 collectEquipmentBuffsByHero + applyEquipmentBuffsToProfile 反查 spec base 接入（engine 顺序 spec→equipment 保证 spec signal 先注入；反查逻辑单测覆盖）。
    - 剩余：①feat 源 target spec 无通道（featCatalog 按 DIMENSION_BY_KIND 过滤不收 buff_upgrade wrapper），需 feat wrapper 通道（更大工程）；②vulnerability/damageReduction/attackSpeed/cooldown spec 的 loot wrapper 不接入（SUPPORTED_BUFF_TARGET_KINDS 只含 DPS/gold/crit/health），需扩展 SUPPORTED。Minsc spec 109 vulnerability +275 即属此类（仍「没算」）。
    - 验证：384 planner/buffs/abilities + 11 specialization-catalog 测试全绿；signal-coverage gate + schema 校验通过。
    - 原分析订正：ability 源 sourceBucket='ability' 不被 progression-exclusion 排除（isAbilitySource 只含 upgrade/upgrade-effect-key），保留进 catalog 正确（ADR 0017）；Minsc(7) 实测 upgrade 源 +200% 被排除（IC snapshot 已含）、loot/feat 源移出。

<!-- auto-todo:end -->
