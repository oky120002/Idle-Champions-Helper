# 项目 TODO

本文件只记录推进主目标时顺手发现、但与当前主目标不一致的后续事项，作为整个项目统一的延后处理清单。

## 使用规则

- 只记录主目标外的发现项，例如问题、优化点、性能点、命名问题、结构问题或后续机会。
- 当前任务已经决定要做、且正在执行中的内容，不写进这里。
- Ralph 执行清单、模块验收清单和阶段计划，不写进这里。
- 每条只写当前事实、影响和建议方向，不写迁移叙事。

## 当前待办

- planner targeting 覆盖缺口：14 个 `hero_dps_multiplier_mult` effect 因 `normalizeTargetRelation`（`signalSemantics.js`）不识别 targets 关系而整体进 unsupported，真实 DPS 加成被丢。未识别关系含位置类（`other`/`self_and_ahead`/`self_and_behind_and_ahead`/`middle_columns`/`tallest_column`/`top_row_of_each_column`/`bottom_row_of_each_column`/`col_and_back_x`/`cascade`）与特定机制类（`heroes[id]`/`bud_setter`/`snowflake`/`active_campaign`/`slot_if_expr`）。建议先补位置类（映射到现有 `HeroPositionRelation` 或扩枚举），特定机制类评估是否长期 unsupported。
- planner unsupported audit: 针对仍然高频的 `buff_upgrade` / `buff_upgrades` 做自动化阵型价值审计，但范围收敛到“基础升级已可见、且直接影响 carry 输出”的剩余子族；优先看 `buff_upgrade_per_target_crusader_mult`、距离相关 wrapper 和少量 still-high-value base effect 缺口，不做泛化全铺。
- planner unsupported audit: 重新审查 `effect_def` / `pre_stack_amount` 在 planner 里的价值边界，能复用共享 effect payload 解析的就下沉到公共层，避免 planner 单独维护第二套解释。
- planner base-effect gap: 评估 `paid_up_front_increase_dps` 是否值得进入 planner。它能解锁 Môrgæn 的 `buff_upgrade_per_target_crusader` 链路，但真实增量依赖金币数量级；在没有稳定静态基线前，不应为了打通 wrapper 而硬塞进主评分。
- planner distance wrapper: 继续审查 `buff_upgrade_per_column_behind_source_mult` 与 `buff_upgrade_mult_by_distance_from_source`。当前归一化快照里前者尚未命中真实样本，后者也未命中样本；若后续官方数据出现，优先复用现有 `per_slot_distance_from_source` 合同，不要再起新评分分支。
- planner unsupported ranking: `buff_upgrade` 仍是 unsupported 榜单首位，但里面已混合大量“基础升级本身不可见”的 wrapper。后续若继续审计，先做“wrapper 命中但 base signal 仍缺失”的分桶统计，再决定是否补 base effect，而不是继续按 raw effect 名称粗看频次。
- planner future scoring: speed/gem 队伍评分。
- planner future scoring: survival/稳过关评分。
- planner future scoring: balanced scoring，混合伤害、存活、速度、可获得性和解释复杂度。
- planner future simulation: step simulation，覆盖逐区、击杀、时间窗口和动态堆叠。
- planner future controls: manual parameter panel，允许用户手动覆盖金币预算、装备、feat、传奇、专精和暂不支持变量。
- planner future data: 更完整的 modron、patron、event、season、temporary buff 投影。
- planner future planning: 多队伍、Trials、Time Gate 和长期成长路线。
- css/tsx 体量预算超限：`src/styles/pages/champions.css` 647 行（>520，必须拆）、`planner.css` / `shared/results/card.css` / `shared/workbench/toolbar.css` 约 407 行（应拆）；`src/components/workbench/PageWorkbenchShell.tsx` 271、`WorkbenchScaffold.tsx` 266（应拆）。下次触碰对应文件时按业务边界拆。
- planner 候选池 / 模拟器实现缺口：`computeHypotheticalBaseline` 已实现但 `candidatePool` all-hypothetical 分支未调用（M4 15.3 候选模式控件接通）；`candidatePool` overrides 只有 level+equipment，缺 feat/specialization/legendary（M2/M3 装备精细）；`deleteUserProfileData` 未清 `heroAbilityOverrides`（待产品决策：override 是否随 profile 一起删）；`simulator-data-coverage.mjs` 的 `generateCoverageReport` 孤儿无 CLI 入口（保留作 M2/M3 definition-key 覆盖审计工具）。
- formation scenarioRef 失效校验缺口：`draft-persistence.md` / `storage-and-recovery.md` 原称恢复时校验 scenarioRef，实际 `src/data/formation-persistence/validation.ts` 不校验（文档已按代码事实修正）。若产品需识别失效场景身份，再补 `scenarioRef.kind/id` 校验。
- planner 9.1 锁槽启发式：`build-models.mjs projectMechanicsToScenario` 对 `slot_escort*` mechanic 按 column 降序锁前排首槽（启发式，官方未标注护送具体槽位）。精确槽位需官方 formation 元数据或人工校准后替换。
- planner 未接线的孤立模块（疑似 M2+ 脚手架，仅有各自测试、无生产 caller，M2 启动时核实去留）：`simulator/gameNumberAddition.ts`（`addGameNumbers` 阈值加法，DPS/gold 链路纯乘法用不到）、`simulator/specializationBaseline.ts` 与 `simulator/goldBudgetBaseline.ts`（可负担等级基线，属阶段 3 金币基线）。
- planner 2.5 PlannerRecommendationSet 未产出：`recommendationEngine` 只返回单一 `PlannerResult`，`results.slice(0, PLANNER_TOP_K)` 仅用于限缩首个合法结果搜索范围；`PlannerRecommendationSet`（carryRanking/topLineups/slotAlternatives/seatCompetition）目标合同待 M4 UI（15.2）消费时再落地。
- planner explanation 字符串耦合：`buildPlannerExplanations`（`recommendationEngine.ts`）通过 `rawExplanations.some(line => line.includes('adjacentBuff'))` 等字符串匹配判断 active signal kind 选叙事文案，signal kind 改名会静默失效。建议 `ScoringResult` 暴露结构化 active signal kinds 供消费。
- planner 设计文档残留：`recommendation-and-placement-design.md` §5 评分规则、§7 输出合同仍描述 pre-v4 的 `carryScore`/`PlannerRecommendationSet` 目标合同（文档自承未实现）；顶部已加指针指向 evolution-plan v4，正文字段级全量同步暂缓，待 §7 目标合同落地时一并修正。

