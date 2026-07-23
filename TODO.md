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

- userDataPage.syncFlow 全量 test:run 偶发失败（alert 找不到），疑测试隔离 flaky <!-- auto-todo:id=atd_086e9011a4 -->
  - 记录时间: `2026-07-20T21:06:24+08:00`
  - 类型: bug
  - 位置: `tests/component/userDataPage.syncFlow.test.tsx:295`
  - 备注:
    - 排查方向：测试隔离/全局状态串扰（jsdom 环境共享、定时器、mock 泄漏）；alert findByRole 找不到说明渲染未达预期态

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

- mobile-header E2E：GlobalSearchBox 移动端未收缩挤占 menuToggle 溢出视口（修正原 z-index 误判） <!-- auto-todo:id=atd_8b07209bb2 -->
  - 记录时间: `2026-07-22T20:37:45+08:00`
  - 类型: bug
  - 位置: `src/styles/app/site-header/search.css:1`
  - 备注: menuToggle.click 失败真因（非 z-index）：390px 视口下 topbar-actions 含 GlobalSearchBox(~198px, search.css .global-search flex:1 1 14rem 无任何 @media 收缩规则) + menu-toggle(152px)；topbar 作为 .site-header grid item min-width:auto 不收缩，内容(506px)溢出 header 内宽(358px)，menuToggle 被推到 right=530(视口外)，中心(454,31)在视口外 → click 回退报 .app-shell--workbench intercepts。
    - 证据：elementFromPoint(454,31)=null（视口外点）；topbar offsetW=506 > header clientW=358；global-search 无 @media 规则
    - 修复方向：决定 GlobalSearchBox 移动端形态（隐藏/icon-only/缩窄 max-width），并给 .site-header__topbar 加 min-width:0 让 grid item 可收缩；需全断点(360/390/520/720/961/1080)视觉验证

- scripts *.test.mjs 仍各自复制 readJson/writeJson <!-- auto-todo:id=atd_3c34cb36b0 -->
  - 记录时间: `2026-07-23T10:26:07+08:00`
  - 类型: optimization
  - 位置: `scripts/normalize-idle-champions-definitions.test.mjs:8`
  - 备注: 约9个 .test.mjs 测试文件各自定义本地 readJson/writeJson（Phase 1 去重时未覆盖测试文件）。
    - 可改用 scripts/data/io-utils.mjs 统一，消除测试侧重复。
    - 处置：测试隔离、低优先，下次批量触碰测试时顺带处理。

- collection 输出 zod 契约已接入 CI；z.infer 单源迁移（前端类型派生）未做 <!-- auto-todo:id=atd_bd064fc8e2 -->
  - 记录时间: `2026-07-23T13:52:50+08:00`
  - 类型: optimization
  - 位置: `src/domain/types/formation.ts:40`
  - 备注: 已完成：champions/adventures/patrons/variants collection schema（scripts/data/collection-schemas.mjs）接入 CI（validate-data-schemas.mjs + data:validate-schema），真实数据 168 目标 0 失败、坏数据被 15 个变异测试拦截；schema 与 src/domain/types 字段对齐。
    - 剩余：zod schema 仍在 scripts/（mjs）侧，前端 src/domain/types 的 Champion/Adventure/Patron/Variant 仍是手写 interface，双源易漂移。
    - 待办：z.infer 单源迁移——schema 提到 src/（ts），前端类型改 z.infer 派生。
    - 处置：随前端类型下一轮触碰逐步迁移；schema 已字段对齐可平滑切换。

- userDataPage.syncFlow 全量 vitest flaky timeout（scripts test 加入后并发压力暴露） <!-- auto-todo:id=atd_9aa293dcfe -->
  - 记录时间: `2026-07-23T20:50:44+08:00`
  - 类型: follow-up
  - 位置: `src/pages/user-data/userDataPage.syncFlow.test.tsx:279`
  - 备注: 「本地开发快照读取失败时不会清空既有浏览器同步快照」test 全量 vitest（src+scripts）1 failed/647，但 vitest run src/ 单独全过（116 files/478 tests）。
    - 根因：scripts .test.mjs→.test.ts 后 31 个 scripts test 加入 vitest 全量，并发压力上升，间接暴露该 marginal waitFor timeout
    - 排查方向：userDataPage 该 test 的 waitFor 超时调宽，或 vitest 并发/隔离配置（pool/maxWorkers/isolate）
    - 属 src 边缘 flaky，非 scripts .mjs→.ts 转换本身的问题

- docs 47 处 .mjs 文件名残留（TS 迁移后文档漂移·M2 审计顺手发现） <!-- auto-todo:id=atd_7f3a9c2e1b -->
  - 记录时间: `2026-07-24T00:33:52+08:00`
  - 类型: follow-up
  - 位置: `docs/modules/planner/signal-coverage-research.md:18`
  - 备注: M2 审计发现——TS 迁移批次（086106ee/78b547b0/265623a0 等）将 scripts/*.mjs→.ts，package.json 入口已同步（916db94），但 docs/ 下 47 处仍引用 .mjs（22 文件）。分类：
    - 当前态脚本职责描述（应修）：`signal-coverage-research.md:18`「signal-coverage.mjs」、`skin-illustration/implementation|pipeline|strategy` 等「仓库已有 skelanim-codec.mjs」、`testing-conventions.md`、`modules/search` 等。
    - 历史/改名记录（evolution-plan §84 可保留旧名作历史）：`evolution-plan.md:110` 文件改名 A→B、`:119` 设计修正要点、`milestone-2:29` 阶段步骤 commit 描述。
    - 同源：与 916db94 同根（TS 迁移漏同步文档侧）。
    - 处置：下次触碰相关文档时按分类处理（当前态描述 .mjs→.ts；历史记录保留）；非 M2 effect/DPS 数据正确性，不阻断质量门。

<!-- auto-todo:end -->
