# 里程碑 2·数据补全

- 作用：M2 执行步骤清单；产出所有 effect 类型进 pool。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 3-8、9.2 / 9.3 全部完成 [x]；9.1 已完成（提前到 M1）。

---

# 阶段 3：金币（gold pool·独立 objective）

**目标**：赚金币阵型。`team_gold_find = base_gold × global_gold_pool × hero_gold_pool`（全队聚合，非单一 carry）。
**风险**：金币模式评分结构（全队聚合）≠ C 位（单一 carry），需独立 scoring 分支。

### 3.0 evaluatePlacementFit 显式 dimension 过滤（前置·防非伤害 pool 泄漏 carryDps） [x]

**背景**：第六轮审计确认 `scoreFormation`（`steadyStateScoring.ts`）调 `evaluatePlacementFit` 未传 `dimension`，`aggregate` 无差别乘所有 pool。M1 全员 damage 维度无影响；**阶段 3 引入 gold、阶段 4 引入 crit 后，非伤害 pool 会泄漏进 carryDps**（同 typecheck masking 教训：绿色掩盖错误）。必须在 3.1 加 gold kind 之前先堵。`EvaluatePlacementFitInput.dimension` 参数 M1 已预留，接通即可。

- **改动**：`collectSignals`/`evaluatePlacementFit` 按 `dimension` 过滤 signal（若尚未真正过滤）；`scoreFormation` 对 carryDps 聚合显式传 `dimension:'damage'`；3.4 gold objective 传 `dimension:'gold'`。
- **测试（先写）**：gold/crit 维度 signal 不进 carryDps（aggregate 只含 damage pool）；damage signal 不进 team_gold_find。
- **验证**：`npm run test:run`。
- **commit**：`fix(planner): 3.0 evaluatePlacementFit 显式 dimension 过滤`。

### 3.1 扩 kind 加 gold [x]
- **改动**：`abilityModel.ts` 的 `HeroAbilityKind` 加 `globalGoldMultiplier`/`heroGoldMultiplier`；`DIMENSION_BY_KIND` 登记 `gold`。
- **测试（先写）**：`DIMENSION_BY_KIND['globalGoldMultiplier'] === 'gold'`；类型级断言。
- **验证**：`npm run typecheck`。
- **commit**：`feat(abilities): 3.1 扩展 gold 维度枚举`。

### 3.2 解析 gold effect [x]
- **改动**：`effect-helpers.ts:463 normalizeEffectSignal` 加 gold 分支（`gold_multiplier_mult`→globalGoldMultiplier；`gold_mult_per_tagged_crusader_mult`→+stackFunc；`gold_mult_per_target_crusader`→参照 :524 模式）。
- **测试（先写）**：`gold_multiplier_mult` 解析为 globalGoldMultiplier；带 stackFunc；非法仍 unsupported。
- **验证**：`npm run test:run`；`npm run data:planner-coverage` 显示 gold 覆盖。
- **commit**：`feat(data): 3.2 解析 gold multiplier effect`。

### 3.3 重跑 build + coverage 验证 [x]
- **改动**：重跑 `npm run data:official`。
- **验证**：coverage 报告 gold signal 数量（0 → ~40+）；JSON 结构校验。
- **commit**：`chore(data): 3.3 重生成 planner model 含 gold signal`。

### 3.4 金币 objective（全队聚合）+ scoringMode 分支 [x]
- **改动**：新建 `src/domain/planner/goldObjective.ts`（`computeTeamGoldFind`）；`steadyStateScoring`/`recommendationEngine` 加 scoringMode 分支（'carry-dps' vs 'team-gold'）。
- **测试（先写）**：金币模式 gold 参与/damage 跳过；team_gold_find 全队聚合；同阵型两模式不同。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 3.4 金币 objective 与 scoringMode 分支`。

### 3.5 UI 推荐模式选择器 [x]
- **改动**：`usePlannerPageModel` 加 scoringMode state；`buildPlannerRecommendation` 加 options.scoringMode；新建 `PlannerScoringMode.tsx`；PlannerResultCard 适配两模式。
- **测试**：模式切换改变结果；两模式 UI 正确。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 3.5 推荐模式选择器`。

### 3.6 浏览器手验金币阵型 [x]
- **验证**：金币模式推荐含 gold_find 英雄；切换模式结果不同；`npm run test:regression`。
- **commit**：无。

---

# 阶段 4：crit（critChance/critDamage pool·进 DPS）

**目标**：暴击进 DPS。
**风险**：crit 期望值近似在 BUD 机制下低估（批判③），MVP 可接受。

### 4.1 扩 kind 加 crit [x]
- **改动**：`HeroAbilityKind` 加 `globalCritChance`/`heroCritChance`/`globalCritDamage`/`heroCritDamage`；DIMENSION_BY_KIND 登记 `crit`。
- **测试**：映射正确；类型级断言。
- **验证**：`npm run typecheck`。
- **commit**：`feat(abilities): 4.1 扩展 crit 维度枚举`。

### 4.2 解析 crit effect [x]
- **改动**：`normalizeEffectSignal` 加 crit 分支（`buff_base_crit_chance_add/mult`/`global_buff_base_crit_*`/`buff_base_crit_damage_*`/`critical_click_*`，~200 条）。
- **测试（先写）**：各 crit 子类解析正确；默认 chance=2.5%/damage=100% 来自 `default_crit_info`。
- **验证**：`npm run test:run`；coverage 显示 crit 覆盖。
- **commit**：`feat(data): 4.2 解析 crit effect`。

### 4.3 crit pool 聚合 [x]
- **改动**：placementFit 加 crit pool：`critChancePool`（Σ add_percent）/ `critDamagePool`；`crit_factor = 1 + total_chance × (total_damage_mult − 1)`。
- **测试（先写）**：pool 内 add 相加；crit_factor 公式正确；默认值 fallback。
- **标注**：BUD 机制下期望值低估 crit 对 BUD 贡献（批判③），MVP 可接受。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 4.3 crit pool 聚合`。

### 4.4 crit_factor 进 DPS [x]
- **改动**：`final_dps × crit_factor`；接入 steadyStateScoring 的 pool 链。
- **测试**：含 crit 的 carryDps > 不含；crit signal 移除后 carryDps 降。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 4.4 crit_factor 进 DPS`。

---

# 阶段 5：health/survival（降级为推图约束·批判②）

**目标**：从独立模式降级为"推图约束"。
**风险**：IC 英雄大部分不死，独立模式价值有限。

### 5.1 解析 health/healing/damage_reduction effect [x]
- **改动**：`normalizeEffectSignal` 加 health/healing/damage_reduction 分支（`health_mult`/`healing_mult`/`global_healing_mult`/`global_health_mult`/`increase_health_by_source_percent`，~270 条百分比；`damage_reduction*` ~40）。
- **`health_add` 留 stage 10（第八轮审计修正）**：`health_add`（413 条）是 **flat 固定生命值**（value 0–90000，如 `health_add,500`=+500HP），非百分比；进当前百分比 survival pool 会把 +500HP 误算成 +500%。survival 维度整体不消费（5.3 留 stage 10），`health_add` 的 flat 聚合（`effectiveHealth=(base+Σflat)×health_pool`）与 survival 消费一并实现，当前进 unsupportedSignals（非静默，有 note）。原 5.1 文案「health_add…~580 条」把 flat 误归百分比，已修正。
- **测试（先写）**：各子类解析正确。
- **验证**：`npm run test:run`；coverage 显示 health 覆盖。
- **commit**：`feat(data): 5.1 解析 health/healing/damage_reduction effect`。

### 5.2 survival pool [x]
- **改动**：placementFit 加 survival pool：`effectiveHealth = baseHealth × health_pool`；`damage_reduction_mult`（玩家侧减伤）。
- **测试（先写）**：health pool 聚合正确；effectiveHealth 计算。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 5.2 survival pool（effectiveHealth + damage_reduction）`。

### 5.3 接入推图预估（约束） [x]（canSurviveBurst 判定已就绪，推图层数建模留 stage 10/M3）
- **改动**：阶段 10 推图预估时，survival 不足（effectiveHealth < monster_damage）则限制推图层数。
- **测试**：survival 不足时推图层数受限。
- **验证**：`npm run test:run`（与 10 联动）。
- **commit**：`feat(planner): 5.3 survival 作为推图约束`。

---

# 阶段 6：vulnerability（破防/易伤·条件性·批判③）

**目标**：敌人侧受伤倍率进 DPS。
**风险**：vulnerability 多是"对特定怪物 tag"的条件性 effect（批判③）。

### 6.1 扩 kind 加 vulnerability [x]
- **改动**：`HeroAbilityKind` 加 `enemyVulnerability`/`damageIncrease`；DIMENSION_BY_KIND 登记 `vulnerability`。
- **测试**：映射正确。
- **验证**：`npm run typecheck`。
- **commit**：`feat(abilities): 6.1 扩展 vulnerability 维度枚举`。

### 6.2 解析 vulnerability effect [x]
- **改动**：`normalizeEffectSignal` 加 vulnerability 分支（`damage_increase`/`increase_damage_against_monster*`/`increase_armored_damage`/`bonus_armored_damage`，~150 条）。
- **测试（先写）**：各子类解析；保留目标怪物 tag 条件。
- **验证**：`npm run test:run`；coverage 显示 vulnerability 覆盖。
- **commit**：`feat(data): 6.2 解析 vulnerability effect`。

### 6.3 条件性匹配（批判③） [x]
- **改动**：vulnerability 按场景怪物类型条件性匹配（monsterTags vs scenario.enemyTypes）；保留 monster tag qualifier。
- **测试（先写）**：怪物 tag 匹配时 vulnerability 生效；不匹配时跳过。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 6.3 vulnerability 条件性匹配`。

### 6.4 vulnerability pool 进 DPS [x]
- **改动**：`final_dps × vulnerabilityPool`（匹配的 vulnerability add 类同 pool 相加 (1+Σadd/100)、mult 类累乘，与 damage pool 聚合一致）。
> **第八轮审计修正（2026-07-24）**：原描述「匹配的 vulnerability Π 累乘」错误——`computeVulnerabilityFactor` 对所有 vuln part 一律累乘，而真实数据 16/20 是 add 类（`damage_increase`/`increase_*`/`bonus_*`），被累乘后两个 +100% 易伤算成 2×2=4（正确 1+(100+100)/100=3），高估 carryDps。修正为 add/mult 分流聚合，与 damage/gold pool 一致；测试补「多个 add 类 vuln 同 pool 相加」。
- **测试**：含 vulnerability 的 carryDps > 不含；条件不满足时不变。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 6.4 vulnerability 进 DPS`。

---

# 阶段 7：speed + BUD（条件性·B0 后决定·批判②）

**目标**：攻速/冷却 + BUD 计算（用户决定要做）。
**风险**：依赖 2.0 spike 确认 hero_dps 是否含攻速（若含，speed 大部分可省）。

### 7.1 解析 speed effect [x]
- **改动**：`normalizeEffectSignal` 加 speed 分支（`attack_speed_mult`/`reduce_attack_cooldown`/`reduce_ultimate_cooldown`/`ability_cooldown_reduction_mult`，~2000 条）。
- **测试（先写）**：各 speed 子类解析正确；attack_interval 字段提取。
- **验证**：`npm run test:run`；coverage 显示 speed 覆盖。
- **commit**：`feat(data): 7.1 解析 speed effect`。

### 7.2 speed 进 DPS（条件性·B0 后决定） [x]（决定：不进 carryDps——hero_dps 按秒模型，speed 精确建模依赖 BUD/cooldown，MVP 暂不应用）
- **改动**：按 2.0 spike 结论：若 hero_dps 含攻速，speed 已在 DPS，7.2 只做 cooldown（影响 ult，ult 也 dps_based，大部分可省）；若不含，speed 独立乘 DPS（`dps × attack_speed_mult`，`time_scale_cap.cap=10` 上限）。
- **测试（先写）**：按结论验证 speed 对 DPS 的影响。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 7.2 speed 进 DPS（按 B0 结论）`。

### 7.3 speed 实现范围决定 [x]（精简：speed 解析进 pool 但不进 carryDps；BUD 作为 speed 感知辅助指标）
- **改动**：根据 7.2 结论，决定 speed 阶段最终实现范围（完整/精简/跳过）。
- **测试**：结论归档。
- **验证**：`npm run test:run`。
- **commit**：`docs(planner): 7.3 speed 实现范围决定`。

### 7.4 BUD 计算（用户决定要做） [x]
- **改动**：新建 `src/domain/simulator/budCalculation.ts`。`BUD = max(各英雄单次伤害)`，单次伤害 = `hero_dps × attack_interval`（来自 7.1）；`ult_damage` 按 `ultimate_damage_params`（`dps_based:true`）派生。
- **测试（先写）**：BUD 计算正确（慢攻击英雄 BUD 高）；ult_damage 派生。
- **标注**：BUD 作为阵型主判断依据（IC 怪物血量按 BUD 缩放），DPS 辅助；两者都计算、都展示（阶段 15）。
- **验证**：`npm run test:run`。
- **commit**：`feat(simulator): 7.4 BUD 计算`。

### 7.5 BUD 实测验证（用户配合游戏实测） [x]（bud-verification.md 已建：公式+方法+局限；绝对值校准 pending 用户游戏内数据）
- **改动**：拿英雄到游戏中看真实 BUD（游戏内显示），对照计算值，归档到 `docs/modules/planner/bud-verification.md`；偏差大则修正 BUD 公式。
- **测试**：实测偏差可接受（如 <30%）。
- **验证**：浏览器实测 + 文档归档。
- **commit**：`docs(planner): 7.5 BUD 实测验证`。

---

# 阶段 8：buff_upgrade wrapper 展开（top N·批判②）

**目标**：扩展 wrapper 解析（不全展开）。
**风险**：43 变体全展开过度（批判②），按覆盖率 top N。

### 8.1 评估 43 变体优先级 [x]
- **改动**：jq 统计各 buff_upgrade 变体频率（`buff_upgrade_add`/`_multiplicative`/`_add_then_mult`/`_per_unique_race`/`_add_flat_amount` 等），排优先级。
- **测试**：统计报告归档 `docs/modules/planner/buff-upgrade-priority.md`。
- **验证**：`jq` 统计完成。
- **commit**：`docs(data): 8.1 buff_upgrade 变体优先级评估`。

### 8.2 实现 top N 变体解析 [x]
- **改动**：扩展 `isPlannerBuffUpgradeKind`（:108）+ `resolvePlannerBuffUpgradeSeed`（:187）支持 top N 变体（覆盖率 >80%）；低频私有 stack（per_mithral_hall_stacks 等）记录但降级进 warning。
- **测试（先写）**：top N 变体解析为正确 bonusScaleOfSignal；低频的进 warning。
- **验证**：`npm run test:run`；coverage 显示 wrapper 解析率 >80%。
- **commit**：`feat(data): 8.2 实现 buff_upgrade top N 变体解析`。

### 8.3 改进 base signal 解析 [x]（根因：base-unresolved 多为非 stat 触发器/pre_stack/do_nothing，合法不可解析；见 buff-upgrade-priority.md）
- **改动**：排查剩 182 base 未解析的根因（base effect 本身 unsupported？引用断链？）。
- **测试（先写）**：原 unsupported 的 base 现在能解析。
- **验证**：`npm run test:run`；coverage base 解析率提升。
- **commit**：`feat(data): 8.3 改进 buff_upgrade base 解析`。

### 8.4 重跑 build + coverage 验证 [x]（resolved 65.5%；80% 天花板由非 stat base 决定，强行解析会引入语义错误）
- **改动**：重跑 build。
- **验证**：wrapper 解析率 60% → >85%；JSON 结构校验。
- **commit**：`chore(data): 8.4 重生成 planner model 含 buff_upgrade 展开`。

### 8.5 wrapper 去重（sentinel 产物）+ bonusScale targeting 复用 [x]

**背景**：第三轮全链路审计（2026-07-21）发现两类 buff_upgrade 精细化缺口，前几轮审计只在关注点列表提"归阶段 8"但未落入执行步骤，本步补齐。第七轮审计（2026-07-24）修正了「不同 magnitude 取最高」的错误前提——见下。

- **sentinel 产物去重**：`collectEffectEntries` 按 `rarityGroupKey`（kind/amountFunc/stackFunc/base targeting，排除 magnitude）识别「同一信号位」。`required_level>=9999` 的 sentinel 条目是 CNE 数据展开产物（如 Jaheira 38 条 `buff_upgrades,100,...` 完全相同，只生效一次），按信号位去重，同组不同 magnitude 取最高（保守；全库仅 3 个真实数据组为此形态，语义待 IC 源码确认）。
- **真升级各自叠加（第七轮修正·原「取最高」为 bug）**：`required_level<9999` 的 buff_upgrade 是各自可购的永久升级，对同一 base 的多条**全部叠加**（如 Bruenor Rally 有 15 条 magnitude 100~300 分布在 level 150~3130，全部叠加）。原 8.5「同 group 取最高 magnitude」把这些折叠成 1 条，严重低估（Bruenor Rally 实际 +2150% 被算成 +300%）。修正：真升级的去重 key 追加 `upgradeId`，同 magnitude 多条也各自保留（不同 upgrade id = 独立升级）。全库 299 个真升级组受此修正影响。消费侧 `evaluatePlacementFit` 的 pool `addPercent` 本就累加同 pool 信号，修正后 buff 正确叠加。
- **完全重复去重（历史·已并入 sentinel 路径）**：早期 `derivedSignalKey` 对完全相同 derived signal 去重（commit b7d750f，recognized 15409→12253）。现统一归 sentinel 路径——完全相同 = 同 rarityGroupKey = 去重；真升级不复走此路径。
- **bonusScale targeting 复用**：`resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时取 base 的 multiplier 折算（`(basePercent × wrapperMag)/100`），不重新校验 base 的 `positionQualifier` / `targetQualifier`（见下方关注点）。wrapper 自身 filter_targets 合并已实现（第四轮→f389586b）：`collectEffectEntries` 派生时 AND 合并 `normalizeTargetQualifier(wrapper effect)` 到 base targetQualifier（`mergeHeroQualifiers`），wrapper 的 `hero_ids` 白名单等不再丢失（真实样本：hero 82 `buff_upgrades` + `hero_ids:[82]`）。

- **测试**：真升级同 base 不同 magnitude 全保留叠加；真升级同 base 同 magnitude 也全保留；sentinel 完全相同副本去重；sentinel 不同 magnitude 取最高。
- **验证**：`npm run test:run`（17/17 通过）。
- **commit**：`fix(data): 8.5 真叠加上级不再误并 + sentinel 产物才去重`。

---

# 阶段 9：scenario 规则 + schema

**目标**：scenario forced/banned/locked 从全空到部分填充；schema 防数据漂移。
**风险**：restrictions 是自由文本（留阶段 12）。

> 9.1 mechanics→lockedSlots 投影已完成 [x]，提前到 M1。

### 9.2 场景英雄限制（eligibility + game_change）→ forced/banned/allowed [x]

**背景**：第三轮审计（2026-07-21）发现 `projectMechanicsToScenario` 只处理 escort（→lockedSlots），忽略 829 个 variant 的英雄限制 `game_change`（原 9.2 只提 eligibility→banned，漏了 game_change）：
- **force_use_heroes（327）**：`{hero_ids:[16]}` 强制使用 → 映射 `scenario.forcedHeroes`（下游 `forceInclude` 约束 recommendationEngine:186 已就绪）；但需 candidate pool 配合——强制英雄即使未拥有也纳入候选，否则用户无该英雄时该 variant 永远非法。
- **only_allow_crusaders（502）**：`{by_ids:{ids:[...]}, by_tags:{tags:"druid|barbarian|ranger"|"evil"|"small|dwarf|..."}}` 白名单 → 需 `allowedHeroes`/`allowedQualifier` 字段 + candidate 过滤；`by_tags` 用 `|` OR 同 `targets.tags` shorthand 方言，可复用 `parseHeroPredicate('shorthand')`。
- **slot_effects（91）/global_effects（296）**：场景级效果（weather damage / global dps reduce per area），不直接限英雄，归阶段 10 推图预估建模，本步不处理。

- **改动**：`projectMechanicsToScenario` 解析 `force_use_heroes` → forcedHeroes、`only_allow_crusaders` → allowedQualifier（by_ids 集合 + by_tags 谓词）；candidate pool 配合强制/白名单；championEligibility/patronEligibility 派生 banned；高价值变体 `semantic-overrides.json` 手工补。
- **测试（先写）**：force_use_heroes variant 的 forcedHeroes 非空且强制生效；only_allow_crusaders by_tags 白名单过滤候选；eligibility banned 生效；手工 override 生效。
- **验证**：`npm run test:run`；planner-scenarios 部分变体 forced/allowed/banned 非空。
- **commit**：`feat(data): 9.2 场景英雄限制 game_change 解析 + eligibility banned`。

> **第七轮审计覆盖范围核对（2026-07-24）**：真实数据（definitions 2026-04-13 快照）确认解析与 raw 一致——`force_use_heroes` 301 个全部投影为 forcedHeroes；`only_allow_crusaders` 的 `by_ids`(9)/`by_tags`(114) 投影为 allowedHeroes/allowedTags（共 129 场景）。但 `only_allow_crusaders` 还有大量**未自动解析的子结构**：`by_stat`(142)/`by_expr`(129)/`by_attack_types`(21)/`by_edge_stat`(17)/`by_seat`(9)/`by_attack_cooldown`(6) 等共 ~343 个。这些不进 candidate 过滤（allowed 为空），但均有对应 `restrictions_text`（如「Only Champions with 14 or more Strength」）→ 归一化进 `restrictions` 自由文本 → 触发「restrictions 为自由文本，尚未自动解析」warning，**非静默**（用户可见、需人工复核）。`by_expr` 归 `expression-evaluator-plan.md`；`by_stat`/`by_attack_types`/`by_seat` 等结构化门槛的自动 enforce 归未来 stat/属性 candidate 过滤步骤（消费层候选模型目前只支持 id/tag 白名单）。

### 9.3 champion-details zod schema + CI [x]
- **改动**：新建 `src/domain/types/champion-details-schema.ts`（zod，覆盖核心字段，raw 用 `z.unknown()`）；CI 加 `data:validate-schema`。
- **测试（先写）**：schema 校验现有 163 文件通过；故意破坏字段被拦截。
- **验证**：`npm run test:run`；schema 拦截破坏。
- **commit**：`feat(data): 9.3 champion-details zod schema 校验`。

---

## M1 审计衍生的 M2 关注点

- ~~`scoreFormation` 调用 `evaluatePlacementFit` 未显式传 `dimension: 'damage'`~~ → **已落步骤 3.0**（第六轮审计提升为前置步骤，不再仅是关注点）。
- `resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时只取 base 的 multiplier，不重新校验 base 的 `positionQualifier` / `targetQualifier`；阶段 8 buff_upgrade 精细化时需评估 base 与外层 targeting 不一致场景。
- **复合 amount_expr 未解析（20 条）**：`upgrade_amount(N,i)+upgrade_amount(N,i)+...`（5 条纯求和，Brig/Xerophon）、`max_upgrade_amount`/`mult_stack`/`feat_amount`/`upgrade_amount(N,dps_update)`（15 条运行时/命名 index）。全为 `hero_dps_multiplier_mult,0`，`resolveSimpleAmountExpr` 只匹配单一，复合回退得 effect 自身 value=0（低估，保守安全）。与 per_hero_expr 数值表达式同域，**归 `expression-evaluator-plan.md` 数值求值器**（`upgrade_amount` 与 `GetUpgradeAmount` 同类），不归本里程碑阶段 8。
- **buff_upgrades wrapper 去重（已修）**：IC 数据中 `required_level>=9999` 的 sentinel 条目被 CNE 展开成完全相同副本（如 Jaheira 38 条 `buff_upgrades,100,9714,...`），只生效一次，按 `rarityGroupKey` 去重。**真升级（`required_level<9999`）对同一 base 的多条全部叠加**（如 Bruenor Rally 15 条 magnitude 100~300），第七轮审计修正原「取最高」bug——真升级 key 追加 upgradeId，同/异 magnitude 多条均各自保留。详见阶段 8.5。

- **未支持的 string target（第四轮审计·2026-07-21）**：`normalizeExplicitTargeting` 的 `STRING_RELATION_MAP` 未覆盖 `other`(56) / `self_slot`(24) / `area`(12) / `active_campaign`(7) / `edge` / `middle_columns` / `front_column` / `bud_setter` / `non_col` / `self_and_behind_and_ahead` 等；未支持者进 unsupportedSignals（保守安全，不静默当作已算）。`other` 语义 = 全队除 source（如 effect_def 214「提高所有其他勇士的生命值」），关联 carryDps effect 仅 2-3 处（`hero_dps_multiplier_mult` 等，余为 health/触发类），精确支持需 `positionQualifier` 增强 excludeSelf 语义，归未来 targeting 精细化。
- **filter_targets type 全量覆盖（第四轮审计）**：`normalizeTargetQualifier` 已接入 `hero_ids`/`exclude_heroes`（heroId AST，复用 `per_hero_expr` 的 `hero_id==N` 节点）；阵型聚合（`has_neighbour_with_tag`/`by_neighbours`/`dominant_affiliation` 等 ~13 处）+ 存档依赖（`affected_by_upgrade`/`not_affected_by_upgrade` 39 处）type 归 `expression-evaluator-plan.md` formationAggregate / 存档依赖节点；`limit_effect_def_per_hero_attack` / `limit_per_effect`（effect 叠加上限）归阶段 8 buff_upgrade 精细 / step simulation。当前 hero_ids 已在 wrapper 派生路径合并生效（f389586b，hero 82 等 wrapper 派生 signal +210 行带 heroId targetQualifier）；exclude_heroes 多因 base effect `targets:'other'` 进 unsupported，待 positionQualifier excludeSelf 增强后生效。全量登记见 `format-quirks.md`。

- **`target_filters_or` 数组内 OR 语义未确认（第六轮审计·待游戏源码确认）**：`getRawFilters` 把 `target_filters_or` 与 `target_filters`/`filter_targets` 一起收集，`normalizeTargetQualifier` 统一按 AND 合并；字段名 `_or` 暗示数组内 OR（任一匹配）。当前零影响（已引用 effect_keys 中全为单 filter，AND=OR；唯一多 filter 样本 effect_def 225 孤立无引用）。保守保留 AND（比 OR 严格→低估=安全方向）。
  - **触发条件**：raw 出现「被引用 + 2+ filter 的 target_filters_or」时，必须先拿 IC 源码/社区文档确认 OR 语义，再在 `normalizeTargetQualifier` 把 `target_filters_or` 单独按 OR 聚合后与其它 AND 组合并。
  - **不确认前禁止改**（OR→高估 carryDps 风险）。详见 `format-quirks.md` 与 TODO `atd_9a3c7e1f02`。归阶段 8 targeting 精细或独立修复。

- **`static_dps_mult` 已接入（第八轮审计·2026-07-24）**：`collectRawEffectEntries` 读 `upgrade.static_dps_mult`（CNE 静态 dps 乘数近似 1.25–5），`collectEffectEntries` 对其 effect 进 unsupported（复杂机制 `target_attacking_monsters_hero_dps_mult` 等）的 upgrade fallback 生成 `heroDpsMultiplier` mult signal（`value=(staticDpsMult−1)×100`，carrySignals，进 damage pool multFactor）。防重复：upgrade 已有可解析 signal（含 wrapper 派生）时不 fallback。35 个 upgrade 的 dps 贡献恢复。测试：`collectEffectEntries static_dps_mult fallback` + `不与可解析 effect 重复`（build-models.test.ts）。端到端：需重跑 `data:official` 重新生成 hero-abilities.json 含 fallback signal。
- **gold 维度漏解析 3 个 effect（第八轮审计·severity 低）**：`resolveGoldSignal` 只解析 `gold_multiplier_mult`(97)/`gold_mult_per_tagged_crusader_mult`(3)，漏 `gold_mult_per_tagged_crusader`（非 _mult，add 变体，样本 `...,25,drow|rogue`，与 _mult 对称）、`gold_mult_per_target_crusader`（样本 `...,20,adj`，与 dps per_target 对称）、`hero_kills_gold_mult`（样本 `...,50`，hero 击杀 gold，语义特殊）→ 全进 unsupported。各 1 个，gold 次要目标，归 gold 维度补强。
- **`amount_func` set/if 被当 unknown→add（第八轮审计·归 expression-evaluator-plan）**：raw effect_key `amount_func` 有 `set`(24)/`if`(14) 值，`normalizeSignalAmountFunc` 只识别 add/mult → 返回 unknown → 消费侧当 add。`set`（设置绝对值，set 到 400% ≠ add +400%）当 add 语义偏差；`if`（条件）需 condition 求值。均归 `expression-evaluator-plan.md`（与 value=0 复合 amount_expr 同域），当 add 是保守 fallback。
- **vulnerability `boss` tag 静默失效（第八轮审计·归 stage 10）**：3 个 vulnerability signal 带 `monsterTags:['boss']`（`increase_damage_against_monster_tag,100,boss`，对 boss +100% 伤害），但 `scenario.enemyTypes` 是怪物种族（beast/humanoid/demon…），**不含 boss**（boss 是怪物等级 `is_boss`，非种族）→ `scoreFormation` 的 `tags.some(tag => enemyTypeSet.has(tag))` 永远 false → 3 个 boss vulnerability 静默失效。`fiend` tag 正常匹配（enemyTypes 含 fiend）。修复需 scenario 标记 boss 怪，归 stage 10 推图预估/boss 建模。
- **专精（specialization）effects 已进理论最大基线，stage 13 缺裁剪（第八轮审计）**：IC 专精不在独立表——`upgrade` 带 `specializationName`/`specializationDescription`/`specializationGraphicId` 字段，专精选项是 upgrade 子集；`collectRawEffectEntries` 遍历所有 upgrade，**所有专精选项的 effects 同时进理论最大基线**（M1 设计可接受）。但 milestone-3 阶段 13「按存档精算」只提 equipment/feat/legendary，**漏了「按玩家选择的专精裁剪」**——实际只能选一个 spec，理论基线把多 spec effects 叠加，高估。归 M3 stage 13 补 `specializationName` 过滤（按 `UserProfileSnapshot.specializations[heroId]` 选 spec，只保留该 spec upgrade）。

数据源格式坑（已在归一化层与代码处理，追源守则见 `AGENTS.md` §1.3）：`upgrade_defines.effect` 常是 JSON 对象串（含伪 JSON）；`effect_defines.targets.tags` 是布尔表达式（`|` / `^` / `!` / `()`）；`upgrade_amount(id,index)` 可跨 upgrade 引用；buff_upgrade wrapper 信号由 `collectEffectEntries` 派生；`STACK_COUNT_RESOLVERS` 与 `SCORING_SUPPORTED_STACK_FUNCS` 由 `scoringSupportSync.test.ts` 守护。
