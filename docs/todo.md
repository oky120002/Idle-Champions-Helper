# 项目 TODO

本文件只记录推进主目标时顺手发现、但与当前主目标不一致的后续事项，作为整个项目统一的延后处理清单。

## 使用规则

- 只记录主目标外的发现项，例如问题、优化点、性能点、命名问题、结构问题或后续机会。
- 当前任务已经决定要做、且正在执行中的内容，不写进这里。
- Ralph 执行清单、模块验收清单和阶段计划，不写进这里。
- 里程碑相关内容（planner M2-M4 阶段、产品长期愿景）归 `docs/modules/planner/evolution-plan.md`，不写进这里。
- 每条只写当前事实、影响和建议方向，不写迁移叙事。

## 当前待办

- css/tsx 体量预算超限：`src/styles/pages/champions.css` 647 行（>520，必须拆）、`planner.css` / `shared/results/card.css` / `shared/workbench/toolbar.css` 约 407 行（应拆）；`src/components/workbench/PageWorkbenchShell.tsx` 271、`WorkbenchScaffold.tsx` 266（应拆）。下次触碰对应文件时按业务边界拆。
- planner 候选池产品决策缺口：`deleteUserProfileData` 未清 `heroAbilityOverrides`（语义是删 profile snapshot，override 是否连带删待产品决策）；`simulator-data-coverage.mjs` 的 `generateCoverageReport` 孤儿无 CLI 入口（保留作 M2/M3 definition-key 覆盖审计工具，或删）。
- formation scenarioRef 失效校验缺口：`src/data/formation-persistence/validation.ts` 不校验 scenarioRef（文档已按代码事实修正）。若产品需识别失效场景身份，再补 `scenarioRef.kind/id` 校验。
- planner 9.1 锁槽启发式：`build-models.mjs projectMechanicsToScenario` 对 `slot_escort*` mechanic 按 column 降序锁前排首槽（启发式，官方未标注护送具体槽位）。精确槽位需官方 formation 元数据或人工校准后替换。
