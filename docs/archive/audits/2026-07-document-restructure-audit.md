# 2026-07 文档重组逐份审计

## 范围与结论

- 审计基线：`a797e553^` 的全部 `docs/**/*.md`，共 128 份。
- 原重构区间：`a797e553..baf81679`；收口审计继续覆盖至 2026-07-27 当前重构提交前状态。
- 结论：原重构已经完成旧路径迁移，但没有完成内容语义纯化。缺口集中在 Runbook 类型缺失、Spec 混入未实施计划、Research 混入决策与操作、综合文档超出单一读者意图。
- 本轮结果：128 份旧文档均有明确最终承载，无内容凭空丢失；旧路径不保留跳转占位。拆分后的当前合同、事实、决策、变更、操作和历史证据分别进入对应生命周期。

本台账是一次性历史证据，为保证逐项追溯允许超过活跃叶子文档的体量预算；当前入口与规则以 `docs/README.md` 和文档治理规范为准。

## 判定方法

1. 逐份读取旧文档的目标、标题层级与段落意图，区分当前合同、外部事实、决策理由、未实施变更、可执行操作和历史事件。
2. 对照当前代码、数据产物和导航，验证最终承载仍存在；不以 Git rename 相似度代替语义判断。
3. 对拆分、合并和删除项检查信息是否由新文档承接，并全仓扫描旧路径、旧文件名与本地链接。
4. 用治理测试约束顶层类型、文档预算、Spec/Change 边界、状态行和本地链接。

## 架构复核

最终采用五类活跃资产与一类历史归档：`specs/`、`research/`、`decisions/`、`changes/`、`runbooks/` 为活跃资产，`archive/` 只保存历史证据。该结构补齐了原计划缺少当前操作手册的位置。

- 吸收 Spec Kit 的原则、需求、方案、任务分离及跨产物一致性检查，但不复制 feature 编号目录和完整工具链。
- 吸收 Superpowers 的探索、设计、计划、执行分离，以及 TDD、小步验证和提交纪律，但不建立第二套计划目录。
- 吸收 Diátaxis 的读者意图分离；本项目没有教程型终端文档需求，因此不照搬四象限。
- 使用 ADR 保存长期决策，使用 Change 保存未落地工作，使用 Runbook 保存当前可执行步骤；这与本项目 local-first、GitHub Pages、数据管线和 AI-first 检索边界一致。

外部框架事实见 `docs/research/documentation/framework-practices.md`，本项目决策见 `docs/decisions/0006-document-taxonomy.md`。

## 逐份台账

| # | 重构前路径 | 最终承载 | 动作 | 结论 |
| ---: | --- | --- | --- | --- |
| 1 | `docs/README.md` | `docs/README.md` | 保留并纯化 | 已核对 |
| 2 | `docs/investigations/README.md` | `docs/archive/investigations/README.md` | 归档 | 已核对 |
| 3 | `docs/investigations/repository/README.md` | `docs/archive/investigations/repository/README.md` | 归档 | 已核对 |
| 4 | `docs/investigations/repository/agents-layering-verification.md` | `docs/archive/investigations/repository/agents-layering-verification.md` | 归档 | 已核对 |
| 5 | `docs/investigations/repository/github-directory-commit/README.md` | `docs/archive/investigations/repository/github-directory-commit/README.md` | 归档 | 已核对 |
| 6 | `docs/investigations/repository/github-directory-commit/fixes-and-github-boundary.md` | `docs/archive/investigations/repository/github-directory-commit/fixes-and-github-boundary.md` | 归档 | 已核对 |
| 7 | `docs/investigations/repository/github-directory-commit/root-cause.md` | `docs/archive/investigations/repository/github-directory-commit/root-cause.md` | 归档 | 已核对 |
| 8 | `docs/investigations/runtime/README.md` | `docs/archive/investigations/runtime/README.md` | 归档 | 已核对 |
| 9 | `docs/investigations/runtime/champions-filter-scroll/README.md` | `docs/archive/investigations/runtime/champions-filter-scroll/README.md` | 归档 | 已核对 |
| 10 | `docs/investigations/runtime/champions-filter-scroll/problem-and-fix.md` | `docs/archive/investigations/runtime/champions-filter-scroll/problem-and-fix.md` | 归档 | 已核对 |
| 11 | `docs/investigations/runtime/champions-filter-scroll/validation.md` | `docs/archive/investigations/runtime/champions-filter-scroll/validation.md` | 归档 | 已核对 |
| 12 | `docs/investigations/runtime/local-run/README.md` | `docs/archive/investigations/runtime/local-run/README.md` | 归档 | 已核对 |
| 13 | `docs/investigations/runtime/local-run/command-results.md` | `docs/archive/investigations/runtime/local-run/command-results.md` | 归档 | 已核对 |
| 14 | `docs/investigations/runtime/local-run/recommended-entry.md` | `docs/archive/investigations/runtime/local-run/recommended-entry.md` | 归档 | 已核对 |
| 15 | `docs/investigations/runtime/playwright-browser-launch/README.md` | `docs/archive/investigations/runtime/playwright-browser-launch/README.md` | 归档 | 已核对 |
| 16 | `docs/investigations/runtime/playwright-browser-launch/full-access-verification.md` | `docs/archive/investigations/runtime/playwright-browser-launch/full-access-verification.md` | 归档 | 已核对 |
| 17 | `docs/investigations/runtime/playwright-browser-launch/restricted-session-findings.md` | `docs/archive/investigations/runtime/playwright-browser-launch/restricted-session-findings.md` | 归档 | 已核对 |
| 18 | `docs/modules/README.md` | `docs/specs/modules/README.md` | 改名或迁移 | 已核对 |
| 19 | `docs/modules/champions/README.md` | `docs/specs/modules/champions/README.md` | 改名或迁移 | 已核对 |
| 20 | `docs/modules/champions/detail/README.md` | `docs/specs/modules/champions/detail/README.md` | 改名或迁移 | 已核对 |
| 21 | `docs/modules/champions/detail/interaction-and-data.md` | `docs/specs/modules/champions/detail/interaction-and-data.md` | 改名或迁移 | 已核对 |
| 22 | `docs/modules/champions/detail/page-structure.md` | `docs/specs/modules/champions/detail/page-structure.md` | 改名或迁移 | 已核对 |
| 23 | `docs/modules/champions/filter/README.md` | `docs/specs/modules/champions/filter/README.md` | 改名或迁移 | 已核对 |
| 24 | `docs/modules/champions/filter/rules-and-acceptance.md` | `docs/specs/modules/champions/filter/rules.md`<br>`docs/specs/modules/champions/filter/acceptance.md` | 按语义拆分 | 已核对 |
| 25 | `docs/modules/champions/filter/scope-and-data.md` | `docs/specs/modules/champions/filter/scope-and-data.md` | 改名或迁移 | 已核对 |
| 26 | `docs/modules/champions/filter/workbench-shell-redesign-design.md` | `docs/specs/modules/champions/filter/workbench-shell.md` | 改名或迁移 | 已核对 |
| 27 | `docs/modules/champions/illustration/README.md` | `docs/specs/modules/champions/illustration/README.md` | 改名或迁移 | 已核对 |
| 28 | `docs/modules/champions/illustration/data-and-build.md` | `docs/specs/modules/champions/illustration/data-and-build.md` | 改名或迁移 | 已核对 |
| 29 | `docs/modules/champions/illustration/runtime-and-acceptance.md` | `docs/specs/modules/champions/illustration/runtime.md`<br>`docs/specs/modules/champions/illustration/acceptance.md` | 按语义拆分 | 已核对 |
| 30 | `docs/modules/champions/illustration/scope-and-boundaries.md` | `docs/specs/modules/champions/illustration/scope-and-boundaries.md` | 改名或迁移 | 已核对 |
| 31 | `docs/modules/formation/README.md` | `docs/specs/modules/formation/README.md` | 改名或迁移 | 已核对 |
| 32 | `docs/modules/formation/draft-persistence.md` | `docs/specs/modules/formation/draft-persistence.md` | 改名或迁移 | 已核对 |
| 33 | `docs/modules/formation/rules-and-acceptance.md` | `docs/specs/modules/formation/rules.md`<br>`docs/specs/modules/formation/acceptance.md` | 按语义拆分 | 已核对 |
| 34 | `docs/modules/formation/scope-and-inputs.md` | `docs/specs/modules/formation/scope-and-inputs.md` | 改名或迁移 | 已核对 |
| 35 | `docs/modules/pets/pets-page-design.md` | `docs/specs/modules/pets/pets-page-design.md` | 改名或迁移 | 已核对 |
| 36 | `docs/modules/planner/README.md` | `docs/specs/modules/planner/README.md` | 改名或迁移 | 已核对 |
| 37 | `docs/modules/planner/bud-verification.md` | `docs/research/data/planner/bud-calibration.md` | 改名或迁移 | 已核对 |
| 38 | `docs/modules/planner/buff-upgrade-priority.md` | `docs/research/data/planner/buff-upgrade-wrappers.md` | 改名或迁移 | 已核对 |
| 39 | `docs/modules/planner/data-source-confirmations.md` | `docs/research/data/planner/monster-and-area-scaling.md`<br>`docs/research/data/planner/patron-perks-and-blessings.md`<br>`docs/research/data/planner/scenario-restrictions.md`<br>`docs/research/data/planner/equipment-and-abilities.md` | 按语义拆分 | 已核对 |
| 40 | `docs/modules/planner/development-design-data.md` | `docs/specs/modules/planner/data-and-privacy.md` | 改名或迁移 | 已核对 |
| 41 | `docs/modules/planner/development-design-simulator.md` | `docs/specs/modules/planner/simulator.md`<br>`docs/specs/modules/planner/computation-runtime.md` | 按语义拆分 | 已核对 |
| 42 | `docs/modules/planner/development-design.md` | `docs/specs/modules/planner/architecture.md` | 改名或迁移 | 已核对 |
| 43 | `docs/modules/planner/expression-evaluator.md` | `docs/specs/modules/planner/expression-evaluator.md` | 改名或迁移 | 已核对 |
| 44 | `docs/modules/planner/prd.md` | `docs/specs/modules/planner/scope.md`<br>`docs/specs/modules/planner/requirements.md` | 按语义拆分 | 已核对 |
| 45 | `docs/modules/planner/recommendation-and-placement-design.md` | `docs/specs/modules/planner/recommendation.md`<br>`docs/specs/modules/planner/search-and-ranking.md` | 按语义拆分 | 已核对 |
| 46 | `docs/modules/planner/signal-coverage-research.md` | `docs/research/data/planner/signal-coverage.md` | 改名或迁移 | 已核对 |
| 47 | `docs/modules/presets/README.md` | `docs/specs/modules/presets/README.md` | 改名或迁移 | 已核对 |
| 48 | `docs/modules/presets/scope-and-model.md` | `docs/specs/modules/presets/scope-and-model.md` | 改名或迁移 | 已核对 |
| 49 | `docs/modules/presets/storage-and-recovery.md` | `docs/specs/modules/presets/storage-and-recovery.md` | 改名或迁移 | 已核对 |
| 50 | `docs/modules/presets/ui-and-acceptance.md` | `docs/specs/modules/presets/ui.md`<br>`docs/specs/modules/presets/acceptance.md` | 按语义拆分 | 已核对 |
| 51 | `docs/modules/search/README.md` | `docs/specs/modules/search/README.md` | 改名或迁移 | 已核对 |
| 52 | `docs/modules/search/build-and-data.md` | `docs/specs/modules/search/build-and-data.md` | 改名或迁移 | 已核对 |
| 53 | `docs/modules/search/runtime-and-ui.md` | `docs/specs/modules/search/runtime-and-ui.md` | 改名或迁移 | 已核对 |
| 54 | `docs/modules/shared-components/README.md` | `docs/specs/modules/shared-components/README.md` | 改名或迁移 | 已核对 |
| 55 | `docs/modules/shared-components/component-list.md` | `docs/specs/modules/shared-components/component-list.md` | 改名或迁移 | 已核对 |
| 56 | `docs/modules/shared-components/helper-list-and-selection.md` | `docs/specs/modules/shared-components/helper-list-and-selection.md` | 改名或迁移 | 已核对 |
| 57 | `docs/modules/shared-components/page-workbench-design.md` | `docs/specs/modules/shared-components/page-workbench-design.md` | 改名或迁移 | 已核对 |
| 58 | `docs/modules/shared-components/shared-components-design.md` | `docs/specs/modules/shared-components/shared-components-design.md` | 改名或迁移 | 已核对 |
| 59 | `docs/modules/user-data/user-data-import-design.md` | `docs/specs/modules/user-data/import.md`<br>`docs/specs/modules/user-data/sources-and-sync.md` | 按语义拆分 | 已核对 |
| 60 | `docs/product/README.md` | `docs/specs/README.md`<br>`docs/specs/product/README.md` | 按语义拆分 | 已核对 |
| 61 | `docs/product/ai-first-css-guidelines.md` | `docs/specs/guidelines/ai-first-css.md` | 改名或迁移 | 已核对 |
| 62 | `docs/product/ai-first-ts-tsx-guidelines.md` | `docs/specs/guidelines/ai-first-ts-tsx.md` | 改名或迁移 | 已核对 |
| 63 | `docs/product/data-normalization-guidelines.md` | `docs/specs/guidelines/data-normalization.md` | 改名或迁移 | 已核对 |
| 64 | `docs/product/design/README.md` | `docs/specs/guidelines/design/README.md` | 改名或迁移 | 已核对 |
| 65 | `docs/product/design/navigation-and-locale-guidelines.md` | `docs/specs/guidelines/design/navigation-and-locale.md` | 改名或迁移 | 已核对 |
| 66 | `docs/product/design/page-header-metrics-guidelines.md` | `docs/specs/guidelines/design/page-header-metrics.md` | 改名或迁移 | 已核对 |
| 67 | `docs/product/documentation-governance.md` | `docs/specs/guidelines/documentation-governance.md` | 改名或迁移 | 已核对 |
| 68 | `docs/product/mobile-compatibility-guidelines.md` | `docs/specs/guidelines/mobile-compatibility.md` | 改名或迁移 | 已核对 |
| 69 | `docs/product/roadmap/README.md` | `docs/specs/product/README.md` | 改名或迁移 | 已核对 |
| 70 | `docs/product/roadmap/product-shape.md` | `docs/specs/product/product-shape.md`<br>`docs/changes/2026-07-planner-capability-extensions.md` | 按语义拆分 | 已核对 |
| 71 | `docs/product/roadmap/risks.md` | `docs/specs/product/risks.md` | 改名或迁移 | 已核对 |
| 72 | `docs/product/roadmap/technical-direction-and-models.md` | `docs/specs/product/technical-models.md`<br>`docs/decisions/0003-static-data-storage.md`<br>`docs/decisions/0005-deployment-github-pages.md` | 按语义拆分 | 已核对 |
| 73 | `docs/product/roadmap/value-and-positioning.md` | `docs/specs/product/value-and-positioning.md` | 改名或迁移 | 已核对 |
| 74 | `docs/product/testing-conventions.md` | `docs/specs/guidelines/testing.md` | 改名或迁移 | 已核对 |
| 75 | `docs/research/README.md` | `docs/research/README.md` | 保留并纯化 | 已核对 |
| 76 | `docs/research/data/README.md` | `docs/research/data/README.md` | 保留并纯化 | 已核对 |
| 77 | `docs/research/data/champion-detail-fields/README.md` | `docs/research/data/champion-detail-fields/README.md` | 保留并纯化 | 已核对 |
| 78 | `docs/research/data/champion-detail-fields/advanced-fields-and-contract.md` | `docs/research/data/champion-detail-fields/advanced-fields.md` | 改名或迁移 | 已核对 |
| 79 | `docs/research/data/champion-detail-fields/contract-and-page-shape.md` | `docs/specs/modules/champions/detail/interaction-and-data.md`<br>`docs/specs/modules/champions/detail/page-structure.md`<br>`docs/research/data/champion-detail-fields/README.md` | 按语义拆分 | 已核对 |
| 80 | `docs/research/data/champion-detail-fields/summary-gap-and-core-fields.md` | `docs/research/data/champion-detail-fields/summary-gap-and-core-fields.md` | 保留并纯化 | 已核对 |
| 81 | `docs/research/data/formation-layout/README.md` | `docs/research/data/formation-layout/README.md` | 保留并纯化 | 已核对 |
| 82 | `docs/research/data/formation-layout/dedupe-and-repo-impact.md` | `docs/research/data/formation-layout/dedupe-and-repo-impact.md` | 保留并纯化 | 已核对 |
| 83 | `docs/research/data/formation-layout/source-fields-and-normalization.md` | `docs/research/data/formation-layout/source-fields-and-normalization.md` | 保留并纯化 | 已核对 |
| 84 | `docs/research/data/game-data-source/README.md` | `docs/research/data/game-data-source/README.md` | 保留并纯化 | 已核对 |
| 85 | `docs/research/data/game-data-source/format-quirks.md` | `docs/research/data/game-data-source/format-quirks.md` | 保留并纯化 | 已核对 |
| 86 | `docs/research/data/game-data-source/implementation-and-risks.md` | `docs/research/data/game-data-source/implementation-and-risks.md` | 保留并纯化 | 已核对 |
| 87 | `docs/research/data/game-data-source/source-decision.md` | `docs/research/data/game-data-source/source-facts.md`<br>`docs/decisions/0002-data-source-strategy.md` | 按语义拆分 | 已核对 |
| 88 | `docs/research/data/language-id-7/README.md` | `docs/research/data/language-id-7/README.md` | 保留并纯化 | 已核对 |
| 89 | `docs/research/data/language-id-7/coverage.md` | `docs/research/data/language-id-7/coverage.md` | 保留并纯化 | 已核对 |
| 90 | `docs/research/data/language-id-7/data-contract.md` | `docs/research/data/language-id-7/data-contract.md` | 保留并纯化 | 已核对 |
| 91 | `docs/research/data/official-data-normalization-audit.md` | `docs/research/data/official-data-normalization-audit.md` | 保留并纯化 | 已核对 |
| 92 | `docs/research/data/pet-catalog/README.md` | `docs/research/data/pet-catalog/README.md` | 保留并纯化 | 已核对 |
| 93 | `docs/research/data/pet-catalog/acquisition-and-implementation.md` | `docs/research/data/pet-catalog/acquisition-and-implementation.md` | 保留并纯化 | 已核对 |
| 94 | `docs/research/data/pet-catalog/source-fields-and-assets.md` | `docs/research/data/pet-catalog/source-fields-and-assets.md` | 保留并纯化 | 已核对 |
| 95 | `docs/research/data/portrait-asset/README.md` | `docs/research/data/portrait-asset/README.md` | 保留并纯化 | 已核对 |
| 96 | `docs/research/data/portrait-asset/repo-integration.md` | `docs/research/data/portrait-asset/repo-integration.md` | 保留并纯化 | 已核对 |
| 97 | `docs/research/data/portrait-asset/resource-chain-and-format.md` | `docs/research/data/portrait-asset/resource-chain-and-format.md` | 保留并纯化 | 已核对 |
| 98 | `docs/research/data/skin-illustration/README.md` | `docs/research/data/skin-illustration/README.md` | 保留并纯化 | 已核对 |
| 99 | `docs/research/data/skin-illustration/implementation.md` | `docs/research/data/skin-illustration/implementation.md` | 保留并纯化 | 已核对 |
| 100 | `docs/research/data/skin-illustration/open-questions.md` | `docs/research/data/skin-illustration/rendering-tradeoffs.md`<br>`docs/changes/2026-07-skin-illustration-followups.md` | 按语义拆分 | 已核对 |
| 101 | `docs/research/data/skin-illustration/pipeline-validation.md` | `docs/research/data/skin-illustration/pipeline-validation.md` | 保留并纯化 | 已核对 |
| 102 | `docs/research/data/skin-illustration/pipeline.md` | `docs/research/data/skin-illustration/pipeline.md` | 保留并纯化 | 已核对 |
| 103 | `docs/research/data/skin-illustration/problem.md` | `docs/research/data/skin-illustration/problem.md` | 保留并纯化 | 已核对 |
| 104 | `docs/research/data/skin-illustration/runtime-format.md` | `docs/research/data/skin-illustration/runtime-format.md` | 保留并纯化 | 已核对 |
| 105 | `docs/research/data/skin-illustration/strategy.md` | `docs/research/data/skin-illustration/rendering-tradeoffs.md`<br>`docs/decisions/0001-illustration-static-over-remote.md`<br>`docs/decisions/0004-animation-bin-canvas-playback.md` | 按语义拆分 | 已核对 |
| 106 | `docs/research/data/static-data-storage-research.md` | `docs/research/data/static-data-storage-research.md` | 保留并纯化 | 已核对 |
| 107 | `docs/research/data/visual-asset/README.md` | `docs/research/data/visual-asset/README.md` | 保留并纯化 | 已核对 |
| 108 | `docs/research/data/visual-asset/field-links-and-examples.md` | `docs/research/data/visual-asset/field-links-and-examples.md` | 保留并纯化 | 已核对 |
| 109 | `docs/research/data/visual-asset/size-and-storage.md` | `docs/research/data/visual-asset/size-and-storage.md` | 保留并纯化 | 已核对 |
| 110 | `docs/research/data/visual-asset/transport-and-browser-boundary.md` | `docs/research/data/visual-asset/transport-and-browser-boundary.md` | 保留并纯化 | 已核对 |
| 111 | `docs/research/deployment/README.md` | `docs/research/deployment/README.md` | 保留并纯化 | 已核对 |
| 112 | `docs/research/deployment/china-hosting/README.md` | `docs/research/deployment/china-hosting/README.md` | 保留并纯化 | 已核对 |
| 113 | `docs/research/deployment/china-hosting/access-optimization.md` | `docs/research/deployment/china-hosting/access-optimization.md` | 保留并纯化 | 已核对 |
| 114 | `docs/research/deployment/china-hosting/decision-and-options.md` | `docs/research/deployment/china-hosting/options-and-filing.md`<br>`docs/decisions/0005-deployment-github-pages.md` | 按语义拆分 | 已核对 |
| 115 | `docs/research/deployment/static-hosting/README.md` | `docs/research/deployment/static-hosting/README.md` | 保留并纯化 | 已核对 |
| 116 | `docs/research/deployment/static-hosting/constraints-and-flow.md` | `docs/research/deployment/static-hosting/constraints-and-flow.md` | 保留并纯化 | 已核对 |
| 117 | `docs/research/deployment/static-hosting/maintenance.md` | `docs/runbooks/github-pages.md` | 重组为当前操作或规范 | 已核对 |
| 118 | `docs/research/testing/README.md` | `docs/specs/guidelines/testing.md`<br>`docs/runbooks/testing.md` | 重组为当前操作或规范 | 已核对 |
| 119 | `docs/research/testing/regression/README.md` | `docs/specs/guidelines/testing.md`<br>`docs/runbooks/testing.md` | 重组为当前操作或规范 | 已核对 |
| 120 | `docs/research/testing/regression/ci-and-gates.md` | `docs/specs/guidelines/testing.md`<br>`docs/runbooks/testing.md` | 重组为当前操作或规范 | 已核对 |
| 121 | `docs/research/testing/regression/coverage.md` | `docs/specs/guidelines/testing.md` | 重组为当前操作或规范 | 已核对 |
| 122 | `docs/research/testing/regression/scope-and-layers.md` | `docs/specs/guidelines/testing.md` | 重组为当前操作或规范 | 已核对 |
| 123 | `docs/troubleshooting/README.md` | `docs/runbooks/README.md` | 重组为当前操作或规范 | 已核对 |
| 124 | `docs/troubleshooting/documentation-aging.md` | `docs/runbooks/documentation-maintenance.md` | 重组为当前操作或规范 | 已核对 |
| 125 | `docs/troubleshooting/github-connectivity.md` | `docs/runbooks/github-connectivity.md` | 重组为当前操作或规范 | 已核对 |
| 126 | `docs/troubleshooting/pages-first-deploy.md` | `docs/runbooks/github-pages.md` | 重组为当前操作或规范 | 已核对 |
| 127 | `docs/troubleshooting/playwright-sandbox.md` | `docs/runbooks/playwright.md` | 重组为当前操作或规范 | 已核对 |
| 128 | `docs/troubleshooting/stale-preview-port.md` | `docs/runbooks/local-development.md` | 重组为当前操作或规范 | 已核对 |
