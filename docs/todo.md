# 项目 TODO

本文件只记录推进主目标时顺手发现、但与当前主目标不一致的后续事项，作为整个项目统一的延后处理清单。

## 使用规则

- 只记录主目标外的发现项，例如问题、优化点、性能点、命名问题、结构问题或后续机会。
- 当前任务已经决定要做、且正在执行中的内容，不写进这里。
- Ralph 执行清单、模块验收清单和阶段计划，不写进这里。
- 每条只写当前事实、影响和建议方向，不写迁移叙事。

## 当前待办

- planner scoring: 继续审查 `per_tagged_crusader_mult`、`per_crusader_mult`、`per_target_crusader` 是否还存在更多来源字段分支未统一，例如 `target_filters_or`、`targets` 内嵌过滤对象之外的变体。
- planner qualifier audit: 审查官方过滤条件里除 `>= <= == > <` 外的比较符与别名写法，统一归一化，避免 stat / age / cooldown 条件静默失效。
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
- planner 候选池 / 模拟器实现缺口：`computeHypotheticalBaseline` 已实现但 `candidatePool` 的 all-hypothetical 分支未调用（未拥有英雄拿到空装备而非同 seat 中位数）；`SimulationChampionProfile` 字段不全（缺 seat/tags/roles/ability scores/localized name/specialization unlock）且 `projectChampionSimulationProfile` 无生产消费；`candidatePool` overrides 只有 level+equipment，缺 feat/specialization/legendary；`deleteUserProfileData` 未清 `plannerHeroOverrides`；`simulator-data-coverage.mjs` 的 `generateCoverageReport` 孤儿无调用。需连线或显式标注暂缓。
- formation scenarioRef 失效校验缺口：`draft-persistence.md` / `storage-and-recovery.md` 原称恢复时校验 scenarioRef，实际 `src/data/formation-persistence/validation.ts` 不校验（文档已按代码事实修正）。若产品需识别失效场景身份，再补 `scenarioRef.kind/id` 校验。
- planner beamSearch seat 冲突未在生成阶段过滤：`beamSearchRanking.ts` 只按 `usedHeroes` 去重，不按 seat 去重；同 seat 候选会被生成、`scoreFormation` 评分为零后仍占 beam 槽位，在 owned 集中同 seat 英雄较多时可能挤掉合法候选导致漏推。建议候选生成处加 `usedSeats` 跟踪跳过同 seat 英雄，`checkFormationLegality` 的 seat 分支退化为兜底。
- planner beamSearch 死参数与弱测试：`BeamSearchInput.adjacency` 与 `BeamCandidate.slotIndex` 从不被读取（adjacency 语义已由 slotTopology 在 placementFit 处理）；`beamSearchRanking.test.ts` 三条用例只断言 `length>0 / score>0`，未验证排序正确性与 beam 剪枝。下次触碰时删死参数并补排序/剪枝断言。
- planner recommendationEngine 冗余：`top.find` 内对 `checkFormationLegality` 的二次复验与 `scoreFormation` 回调把非法阵型置零重复；`formatScore` 是 `formatGameNumber` 的单点包装。可去重并内联。
- planner 9.1 锁槽启发式：`build-models.mjs projectMechanicsToScenario` 对 `slot_escort*` mechanic 按 column 降序锁前排首槽（启发式，官方未标注护送具体槽位）。精确槽位需官方 formation 元数据或人工校准后替换。
- planner 设计文档残留：`recommendation-and-placement-design.md` §5 评分规则、§7 输出合同仍描述 pre-v4 的 `carryScore`/`PlannerRecommendationSet` 目标合同（文档自承未实现）；顶部已加指针指向 evolution-plan v4，正文字段级全量同步暂缓，待 §7 目标合同落地时一并修正。

