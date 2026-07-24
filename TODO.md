<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- css/tsx 体量预算超限，4 文件需按业务边界拆 <!-- auto-todo:id=atd_5fbbb7ac36 -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: optimization
  - 位置: `src/styles/pages/champions.css:1`
  - 备注: champions.css 647 行（>520 必须拆）、planner.css / shared/results/card.css / shared/workbench/toolbar.css 约 407 行（应拆）；PageWorkbenchShell.tsx 271、WorkbenchScaffold.tsx 266（应拆）
    - 策略：下次触碰对应文件时按业务边界拆，不强制现在拆

- formation-persistence validation 不校验 scenarioRef <!-- auto-todo:id=atd_c6d7b8b82a -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: follow-up
  - 位置: `src/data/formation-persistence/validation.ts`
  - 备注: validation.ts 只校验 slotIds/championIds，不校验 scenarioRef.kind/id（文档已按代码事实修正）
    - 处置：若产品需识别失效场景身份，再补 scenarioRef 校验

- 9.1 escort 锁槽按 column 降序启发式，官方未标注具体槽位 <!-- auto-todo:id=atd_492b5b61bd -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: issue
  - 位置: `scripts/data/build-models.mjs`
  - 备注: projectMechanicsToScenario 对 slot_escort* mechanic 按 column 降序锁前排首槽（启发式，官方未标注护送具体槽位）
    - 处置：精确槽位需官方 formation 元数据或人工校准后替换

- placementFit.ts 仍超体量预算（567 行，>480 必须拆） <!-- auto-todo:id=atd_f1c3d69582 -->
  - 记录时间: `2026-07-20T12:52:00+08:00`
  - 类型: optimization
  - 位置: `src/domain/planner/placementFit.ts:1`
  - 备注: 第三轮审计重构已减 213 行（消除 stackFunc 分支重复），但文件仍承载 pool 聚合 + 位置关系匹配 + stack 计数解析三职责。
    - 处置: 下次触碰时按职责拆分（positionMatching / stackResolution / poolAggregation），不强制现在拆

- per_hero_expr 存档依赖布尔谓词 17 个被整体丢弃（数据流缺口） <!-- auto-todo:id=atd_d957df0b59 -->
  - 记录时间: `2026-07-21T10:17:41+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:114`
  - 备注: parseHeroPredicate 对 HasEffect/GetUpgradeUnlocked/GetFeatEquipped/GetUpgradePurchased/NumEffectKey/EligibleForPatron/is_alive/DefHasTag 等存档依赖布尔谓词返回 null，含它们的 per_hero_expr 整体保守丢弃。
    - 影响：这些 signal 的 formationCountQualifier 退化为 null/filterQualifier，stack 数量可能高估；raw 164 个去重 per_hero_expr 中 17 个（10.4%）受影响
    - 关联：expression-evaluator-plan.md，需 profile context（装备/专长/effect 状态），属后续 milestone
    - 处置：随 numericExpression 落地补存档依赖布尔节点 + profile context 求值

- targets.type:heroes 英雄 ID 白名单未映射（filter_targets hero_ids/exclude_heroes 已处理） <!-- auto-todo:id=atd_3f8b5d17e2 -->
  - 记录时间: `2026-07-21T16:10:00+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/signalSemantics.ts:114`
  - 备注: 英雄 ID 定位两条路径的处理状态：
    - filter_targets：exclude_heroes/hero_ids **已处理**（146c4723 normalizeTargetQualifier heroIdsToPredicate，heroId AST 节点）；wrapper 派生路径合并生效（f389586b，hero 82 等 +210 行）。
    - targets：`{type:"heroes",hero_ids:[...]}`（raw 30 处）仍未处理——normalizeObjectRelation 无 type:heroes 映射 → normalizeExplicitTargeting unsupported → 整条 effect 丢弃。当前影响小（hero_dps_multiplier_mult 仅 10 处因 targets unsupported，其中 type:heroes 1 处，余为 other/active_campaign/slot_if_expr 等，多为孤立 effect_def）。
    - affected_by_upgrade 是 upgrade_id 运行时依赖，保持丢弃合理。
    - 处置：低频，归 M2+ 目标限定精化时补（normalizeObjectRelation 映射 type:heroes→relation='any' + hero_ids 提取到 targetQualifier）。

- collection 输出 zod 契约已接入 CI；z.infer 单源迁移（前端类型派生）未做 <!-- auto-todo:id=atd_bd064fc8e2 -->
  - 记录时间: `2026-07-23T13:52:50+08:00`
  - 类型: optimization
  - 位置: `src/domain/types/formation.ts:40`
  - 备注: 已完成：champions/adventures/patrons/variants collection schema（scripts/data/collection-schemas.mjs）接入 CI（validate-data-schemas.mjs + data:validate-schema），真实数据 168 目标 0 失败、坏数据被 15 个变异测试拦截；schema 与 src/domain/types 字段对齐。
    - 剩余：zod schema 仍在 scripts/（mjs）侧，前端 src/domain/types 的 Champion/Adventure/Patron/Variant 仍是手写 interface，双源易漂移。
    - 待办：z.infer 单源迁移——schema 提到 src/（ts），前端类型改 z.infer 派生。
    - 处置：随前端类型下一轮触碰逐步迁移；schema 已字段对齐可平滑切换。

- deleteUserProfileData 未清 heroAbilityOverrides，override 是否随 profile 删待产品决策 <!-- auto-todo:id=atd_218690060f -->
  - 记录时间: `2026-07-24T10:59:06+08:00`
  - 类型: follow-up
  - 位置: `src/data/user-profile-store/userProfileStore.ts:68`
  - 备注: deleteUserProfileData 语义是删 profile snapshot（handleDelete 后 setSyncState no-snapshot），不清 heroAbilityOverrides；override 是否随 profile 删待产品决策
    - 原 generateCoverageReport 孤学子项已于 2026-07-24 删除（simulator-data-coverage.ts + simulatorDataCoverage.test.ts，无调用方、无文档计划），本条仅剩 heroAbilityOverrides

<!-- auto-todo:end -->
