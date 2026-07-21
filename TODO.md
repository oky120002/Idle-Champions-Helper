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

- deleteUserProfileData 未清 heroAbilityOverrides + generateCoverageReport 孤儿 <!-- auto-todo:id=atd_d15fc2acfd -->
  - 记录时间: `2026-07-20T11:43:52+08:00`
  - 类型: follow-up
  - 位置: `src/data/user-profile-store/userProfileStore.ts:68`
  - 备注: deleteUserProfileData 语义是删 profile snapshot（handleDelete 后 setSyncState no-snapshot），不清 heroAbilityOverrides；override 是否随 profile 删待产品决策
    - generateCoverageReport：simulator-data-coverage.mjs 孤儿无 CLI 入口，保留作 M2/M3 definition-key 覆盖审计或删

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

- mobile-header-layout E2E 预存在失败：menuToggle.click 被 .app-shell--workbench 拦截 <!-- auto-todo:id=atd_3bd0ba66aa -->
  - 记录时间: `2026-07-20T14:37:58+08:00`
  - 类型: bug
  - 位置: `tests/e2e/mobile-header-layout.spec.ts:68`
  - 备注: M1 第四轮审计期间运行 test:regression 时发现；stash 改动后在干净 base（5b3fdd78）上同样失败，确认与 planner 攡动无关。
    - 影响：test:regression 关卡的 test:e2e 步骤始终红，掩盖后续真实 E2E 回归
    - 证据：menuToggle.click 被 .app-shell--workbench intercepts pointer events；可能是 z-index/overlay/工作台 shell 在移动端视口下覆盖了 nav toggle
    - 排查方向：移动端视口下 .app-shell--workbench 与 .site-nav 的堆叠上下文与 pointer-events

- userDataPage.syncFlow 全量 test:run 偶发失败（alert 找不到），疑测试隔离 flaky <!-- auto-todo:id=atd_086e9011a4 -->
  - 记录时间: `2026-07-20T21:06:24+08:00`
  - 类型: bug
  - 位置: `tests/component/userDataPage.syncFlow.test.tsx:295`
  - 备注:
    - 排查方向：测试隔离/全局状态串扰（jsdom 环境共享、定时器、mock 泄漏）；alert findByRole 找不到说明渲染未达预期态

- abilities 层 .js+.d.ts 迁移到 .ts（消除手写声明双份维护） <!-- auto-todo:id=atd_23d46dc48e -->
  - 记录时间: `2026-07-21T09:42:34+08:00`
  - 类型: optimization
  - 位置: `src/domain/abilities/heroPredicate.js`
  - 备注: heroPredicate/signalSemantics/effect-string 三个 .js 被 Node .mjs 数据脚本与前端共享，故妥协成手写 .js+.d.ts；手写 .d.ts 与实现两份维护易漂移、失去编译期类型保护。
    - 背景：Node v26 原生支持 type stripping，无需 tsx/ts-node，可零运行时依赖回归 .ts
    - 处置：在 numericExpression（expression-evaluator-plan.md）落地前迁移，避免新模式扩散
    - 范围：约 11 处 import 后缀 .js→.ts（3 .mjs + 2 .ts + 3 测试），删 3 个 .d.ts

- per_hero_expr 存档依赖布尔谓词 17 个被整体丢弃（数据流缺口） <!-- auto-todo:id=atd_d957df0b59 -->
  - 记录时间: `2026-07-21T10:17:41+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.js:114`
  - 备注: parseHeroPredicate 对 HasEffect/GetUpgradeUnlocked/GetFeatEquipped/GetUpgradePurchased/NumEffectKey/EligibleForPatron/is_alive/DefHasTag 等存档依赖布尔谓词返回 null，含它们的 per_hero_expr 整体保守丢弃。
    - 影响：这些 signal 的 formationCountQualifier 退化为 null/filterQualifier，stack 数量可能高估；raw 164 个去重 per_hero_expr 中 17 个（10.4%）受影响
    - 关联：expression-evaluator-plan.md，需 profile context（装备/专长/effect 状态），属后续 milestone
    - 处置：随 numericExpression 落地补存档依赖布尔节点 + profile context 求值

- taggedChampionBuff 的 attackType targetQualifier 被误判 missing-target <!-- auto-todo:id=atd_b240ff7af0 -->
  - 记录时间: `2026-07-21T10:17:41+08:00`
  - 类型: issue
  - 位置: `src/domain/planner/placementFit.ts:575`
  - 备注: evaluatePlacementFit 对 taggedChampionBuff 检查 targetQualifier 是否含 tag/stat 节点，漏 attackType；纯 attackType 限定的 taggedChampionBuff 会被误判「缺少 carry 目标标签」不计分。
    - 预存行为（本次只改结构 requiredStats→predicateHasNode），低概率（tag_ effect 通常带 tag filter）
    - 处置：predicateHasNode 补 attackType 检查，或确认 raw 无此组合后忽略

- effect_defines.effect_keys 非数组（CNE 单对象序列化）被消费层静默丢弃 <!-- auto-todo:id=atd_7c2a1e9b4d -->
  - 记录时间: `2026-07-21T16:10:00+08:00`
  - 类型: robustness
  - 位置: `scripts/data/effect-helpers.mjs:314`
  - 备注: collectRawEffectEntries 读 `effect_keys` 时只认 `Array.isArray`；raw 中 6 个 effect_def 的 effect_keys 是单对象/空串（CNE 单元素序列化为裸对象而非 1 元数组），非数组时整条 effect_key 静默丢弃。
    - 当前影响：0（6 个全是孤儿 effect_def，无 upgrade 引用）
    - 处置：若将来出现被引用的非数组 effect_keys，在消费层归一化 `非数组→[对象]`，或在 normalize 层 coerce；暂因 0 影响不修

- 英雄 ID 定位（filter_targets exclude_heroes/hero_ids 与 targets heroes）未被消费 <!-- auto-todo:id=atd_3f8b5d17e2 -->
  - 记录时间: `2026-07-21T16:10:00+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/signalSemantics.js:170`（normalizeTargetQualifier）/`signalSemantics.js:114`（normalizeObjectRelation）
  - 备注: 两条路径的英雄 ID 定位都未被消费：
    - filter_targets：exclude_heroes（3 处，`{hero_ids:[146]}`=排除）与 hero_ids（2 处，`{hero_ids:[82]}`=仅指定）——normalizeTargetQualifier 漏处理，退化为无 ID 限定（轻微过度应用）。
    - targets：`{type:"heroes",hero_ids:[...]}` 走 normalizeObjectRelation position path，无映射 → normalizeExplicitTargeting unsupported → 整条 effect 丢弃（如 25 个 hero_dps_multiplier_mult base，保守少计）。
    - affected_by_upgrade（16 处）是 upgrade_id 运行时依赖，保持丢弃合理。
    - 处置：低频，M2+ 精化目标限定时统一补 heroId 节点（NOT/精确匹配）；filter_targets 路径过度应用、targets 路径少计，方向相反但都是边界精度问题。

<!-- auto-todo:end -->
