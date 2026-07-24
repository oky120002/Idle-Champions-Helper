<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

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

- deleteUserProfileData 未清 heroAbilityOverrides，override 是否随 profile 删待产品决策 <!-- auto-todo:id=atd_218690060f -->
  - 记录时间: `2026-07-24T10:59:06+08:00`
  - 类型: follow-up
  - 位置: `src/data/user-profile-store/userProfileStore.ts:68`
  - 备注: deleteUserProfileData 语义是删 profile snapshot（handleDelete 后 setSyncState no-snapshot），不清 heroAbilityOverrides；override 是否随 profile 删待产品决策
    - 原 generateCoverageReport 孤学子项已于 2026-07-24 删除（simulator-data-coverage.ts + simulatorDataCoverage.test.ts，无调用方、无文档计划），本条仅剩 heroAbilityOverrides

- scoreFormation 三重 evaluatePlacementFit 重复计算 position/hero 限定检查 <!-- auto-todo:id=atd_3cc0113de7 -->
  - 记录时间: `2026-07-24T13:20:40+08:00`
  - 类型: optimization
  - 位置: `src/domain/planner/steadyStateScoring.ts:239`
  - 备注: 每个 (carry,support) 对对 damage/crit/vulnerability 各调一次 evaluatePlacementFit，但 position/hero 限定检查（matchesPositionQualifier/matchesHeroQualifier）与 dimension 无关，被重复计算 3×。
    - 影响：阵型评分热路径 3× 冗余，N² 对 × 3 次 × 全信号遍历
    - 修复方向：单次无 dimension 调用 + 按 DIMENSION_BY_KIND[part.signalKind] 分区 scoreBreakdown
    - 证据：steadyStateScoring.ts:240/269/287 三处 evaluatePlacementFit 调用

- crit/vuln 维度的 evaluatePlacementFit pools 是死代码（计算后从不消费） <!-- auto-todo:id=atd_6badc71012 -->
  - 记录时间: `2026-07-24T13:20:44+08:00`
  - 类型: optimization
  - 位置: `src/domain/planner/steadyStateScoring.ts:269`
  - 备注: scoreFormation 对 dimension='crit'/'vulnerability' 调 evaluatePlacementFit，但其返回的 fit.pools（addPercent/multFactor 聚合）从不被读取——只用 scoreBreakdown 喂给 computeCritFactor/computeVulnerabilityFactor。
    - 影响：2/3 pool 聚合计算被丢弃，热路径无谓开销
    - 修复方向：evaluatePlacementFit 支持只产 scoreBreakdown（跳过 pool 聚合），或合并到三重调用消除方案
    - 证据：steadyStateScoring.ts 只 mergePools 了 damage 的 fit.pools（:266），critFit.pools/vulnFit.pools 无引用

- data:official 等 node scripts 经 buildModels 传递导入 src/ 在裸 node 下 ERR_MODULE_NOT_FOUND <!-- auto-todo:id=atd_7154d0480e -->
  - 记录时间: `2026-07-24T21:16:19+08:00`
  - 类型: follow-up
  - 位置: `package.json:scripts.data:official`
  - 备注: package.json 的 data:official（node scripts/build-idle-champions-data.ts）及任何经 buildModels 传递导入 src/ 的数据脚本，在裸 node v26 下因 src/domain/abilities/*.ts 使用 extensionless 相对导入（signalSemantics.ts → './heroTargetingRelation'）而抛 ERR_MODULE_NOT_FOUND。
    - 影响：整个数据管线（normalize→buildModels→searchIndex）无法用文档记载的 node scripts/*.ts 方式重跑；当前只能经 vitest（build-models.test.ts）或 npx tsx 运行
    - 证据：node scripts/build-idle-champions-data.ts 直接报 Cannot find module '.../src/domain/abilities/heroTargetingRelation' imported from signalSemantics.ts
    - 处置：统一脚本导入风格为带 .ts 扩展，或为 data 脚本引入 tsx/loader
    - 关联：非 M3 引入，pre-existing 基础设施问题，第九轮 M3 审计时顺手发现

<!-- auto-todo:end -->
