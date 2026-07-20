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

<!-- auto-todo:end -->
