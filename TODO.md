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

<!-- auto-todo:end -->
