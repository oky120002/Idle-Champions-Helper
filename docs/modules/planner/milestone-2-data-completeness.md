# 里程碑 2·数据补全

- 作用：M2 执行步骤清单；产出所有 effect 类型进 pool。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 3-8、9.2 / 9.3 待做 [ ]；9.1 已完成（提前到 M1）。

---

# 阶段 3：金币（gold pool·独立 objective）

**目标**：赚金币阵型。`team_gold_find = base_gold × global_gold_pool × hero_gold_pool`（全队聚合，非单一 carry）。
**风险**：金币模式评分结构（全队聚合）≠ C 位（单一 carry），需独立 scoring 分支。

### 3.1 扩 kind 加 gold
- **改动**：`abilityModel.ts` 的 `HeroAbilityKind` 加 `globalGoldMultiplier`/`heroGoldMultiplier`；`DIMENSION_BY_KIND` 登记 `gold`。
- **测试（先写）**：`DIMENSION_BY_KIND['globalGoldMultiplier'] === 'gold'`；类型级断言。
- **验证**：`npm run typecheck`。
- **commit**：`feat(abilities): 3.1 扩展 gold 维度枚举`。

### 3.2 解析 gold effect
- **改动**：`effect-helpers.mjs:463 normalizeEffectSignal` 加 gold 分支（`gold_multiplier_mult`→globalGoldMultiplier；`gold_mult_per_tagged_crusader_mult`→+stackFunc；`gold_mult_per_target_crusader`→参照 :524 模式）。
- **测试（先写）**：`gold_multiplier_mult` 解析为 globalGoldMultiplier；带 stackFunc；非法仍 unsupported。
- **验证**：`npm run test:run`；`npm run data:planner-coverage` 显示 gold 覆盖。
- **commit**：`feat(data): 3.2 解析 gold multiplier effect`。

### 3.3 重跑 build + coverage 验证
- **改动**：重跑 `npm run data:official`。
- **验证**：coverage 报告 gold signal 数量（0 → ~40+）；JSON 结构校验。
- **commit**：`chore(data): 3.3 重生成 planner model 含 gold signal`。

### 3.4 金币 objective（全队聚合）+ scoringMode 分支
- **改动**：新建 `src/domain/planner/goldObjective.ts`（`computeTeamGoldFind`）；`steadyStateScoring`/`recommendationEngine` 加 scoringMode 分支（'carry-dps' vs 'team-gold'）。
- **测试（先写）**：金币模式 gold 参与/damage 跳过；team_gold_find 全队聚合；同阵型两模式不同。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 3.4 金币 objective 与 scoringMode 分支`。

### 3.5 UI 推荐模式选择器
- **改动**：`usePlannerPageModel` 加 scoringMode state；`buildPlannerRecommendation` 加 options.scoringMode；新建 `PlannerScoringMode.tsx`；PlannerResultCard 适配两模式。
- **测试**：模式切换改变结果；两模式 UI 正确。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 3.5 推荐模式选择器`。

### 3.6 浏览器手验金币阵型
- **验证**：金币模式推荐含 gold_find 英雄；切换模式结果不同；`npm run test:regression`。
- **commit**：无。

---

# 阶段 4：crit（critChance/critDamage pool·进 DPS）

**目标**：暴击进 DPS。
**风险**：crit 期望值近似在 BUD 机制下低估（批判③），MVP 可接受。

### 4.1 扩 kind 加 crit
- **改动**：`HeroAbilityKind` 加 `globalCritChance`/`heroCritChance`/`globalCritDamage`/`heroCritDamage`；DIMENSION_BY_KIND 登记 `crit`。
- **测试**：映射正确；类型级断言。
- **验证**：`npm run typecheck`。
- **commit**：`feat(abilities): 4.1 扩展 crit 维度枚举`。

### 4.2 解析 crit effect
- **改动**：`normalizeEffectSignal` 加 crit 分支（`buff_base_crit_chance_add/mult`/`global_buff_base_crit_*`/`buff_base_crit_damage_*`/`critical_click_*`，~200 条）。
- **测试（先写）**：各 crit 子类解析正确；默认 chance=2.5%/damage=100% 来自 `default_crit_info`。
- **验证**：`npm run test:run`；coverage 显示 crit 覆盖。
- **commit**：`feat(data): 4.2 解析 crit effect`。

### 4.3 crit pool 聚合
- **改动**：placementFit 加 crit pool：`critChancePool`（Σ add_percent）/ `critDamagePool`；`crit_factor = 1 + total_chance × (total_damage_mult − 1)`。
- **测试（先写）**：pool 内 add 相加；crit_factor 公式正确；默认值 fallback。
- **标注**：BUD 机制下期望值低估 crit 对 BUD 贡献（批判③），MVP 可接受。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 4.3 crit pool 聚合`。

### 4.4 crit_factor 进 DPS
- **改动**：`final_dps × crit_factor`；接入 steadyStateScoring 的 pool 链。
- **测试**：含 crit 的 carryDps > 不含；crit signal 移除后 carryDps 降。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 4.4 crit_factor 进 DPS`。

---

# 阶段 5：health/survival（降级为推图约束·批判②）

**目标**：从独立模式降级为"推图约束"。
**风险**：IC 英雄大部分不死，独立模式价值有限。

### 5.1 解析 health/healing/damage_reduction effect
- **改动**：`normalizeEffectSignal` 加 health/healing/damage_reduction 分支（`health_mult`/`health_add`/`healing_mult`/`global_health_mult`，~580 条；`damage_reduction*` ~40）。
- **测试（先写）**：各子类解析正确。
- **验证**：`npm run test:run`；coverage 显示 health 覆盖。
- **commit**：`feat(data): 5.1 解析 health/healing/damage_reduction effect`。

### 5.2 survival pool
- **改动**：placementFit 加 survival pool：`effectiveHealth = baseHealth × health_pool`；`damage_reduction_mult`（玩家侧减伤）。
- **测试（先写）**：health pool 聚合正确；effectiveHealth 计算。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 5.2 survival pool（effectiveHealth + damage_reduction）`。

### 5.3 接入推图预估（约束）
- **改动**：阶段 10 推图预估时，survival 不足（effectiveHealth < monster_damage）则限制推图层数。
- **测试**：survival 不足时推图层数受限。
- **验证**：`npm run test:run`（与 10 联动）。
- **commit**：`feat(planner): 5.3 survival 作为推图约束`。

---

# 阶段 6：vulnerability（破防/易伤·条件性·批判③）

**目标**：敌人侧受伤倍率进 DPS。
**风险**：vulnerability 多是"对特定怪物 tag"的条件性 effect（批判③）。

### 6.1 扩 kind 加 vulnerability
- **改动**：`HeroAbilityKind` 加 `enemyVulnerability`/`damageIncrease`；DIMENSION_BY_KIND 登记 `vulnerability`。
- **测试**：映射正确。
- **验证**：`npm run typecheck`。
- **commit**：`feat(abilities): 6.1 扩展 vulnerability 维度枚举`。

### 6.2 解析 vulnerability effect
- **改动**：`normalizeEffectSignal` 加 vulnerability 分支（`damage_increase`/`increase_damage_against_monster*`/`increase_armored_damage`/`bonus_armored_damage`，~150 条）。
- **测试（先写）**：各子类解析；保留目标怪物 tag 条件。
- **验证**：`npm run test:run`；coverage 显示 vulnerability 覆盖。
- **commit**：`feat(data): 6.2 解析 vulnerability effect`。

### 6.3 条件性匹配（批判③）
- **改动**：vulnerability 按场景怪物类型匹配（非简单全局 Π）；保留 monster tag qualifier。
- **测试（先写）**：怪物 tag 匹配时 vulnerability 生效；不匹配时跳过。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 6.3 vulnerability 条件性匹配`。

### 6.4 vulnerability pool 进 DPS
- **改动**：`final_dps × vulnerabilityPool`（匹配的 vulnerability Π）。
- **测试**：含 vulnerability 的 carryDps > 不含；条件不满足时不变。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 6.4 vulnerability 进 DPS`。

---

# 阶段 7：speed + BUD（条件性·B0 后决定·批判②）

**目标**：攻速/冷却 + BUD 计算（用户决定要做）。
**风险**：依赖 2.0 spike 确认 hero_dps 是否含攻速（若含，speed 大部分可省）。

### 7.1 解析 speed effect
- **改动**：`normalizeEffectSignal` 加 speed 分支（`attack_speed_mult`/`reduce_attack_cooldown`/`reduce_ultimate_cooldown`/`ability_cooldown_reduction_mult`，~2000 条）。
- **测试（先写）**：各 speed 子类解析正确；attack_interval 字段提取。
- **验证**：`npm run test:run`；coverage 显示 speed 覆盖。
- **commit**：`feat(data): 7.1 解析 speed effect`。

### 7.2 speed 进 DPS（条件性·B0 后决定）
- **改动**：按 2.0 spike 结论：若 hero_dps 含攻速，speed 已在 DPS，7.2 只做 cooldown（影响 ult，ult 也 dps_based，大部分可省）；若不含，speed 独立乘 DPS（`dps × attack_speed_mult`，`time_scale_cap.cap=10` 上限）。
- **测试（先写）**：按结论验证 speed 对 DPS 的影响。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 7.2 speed 进 DPS（按 B0 结论）`。

### 7.3 speed 实现范围决定
- **改动**：根据 7.2 结论，决定 speed 阶段最终实现范围（完整/精简/跳过）。
- **测试**：结论归档。
- **验证**：`npm run test:run`。
- **commit**：`docs(planner): 7.3 speed 实现范围决定`。

### 7.4 BUD 计算（用户决定要做）
- **改动**：新建 `src/domain/simulator/budCalculation.ts`。`BUD = max(各英雄单次伤害)`，单次伤害 = `hero_dps × attack_interval`（来自 7.1）；`ult_damage` 按 `ultimate_damage_params`（`dps_based:true`）派生。
- **测试（先写）**：BUD 计算正确（慢攻击英雄 BUD 高）；ult_damage 派生。
- **标注**：BUD 作为阵型主判断依据（IC 怪物血量按 BUD 缩放），DPS 辅助；两者都计算、都展示（阶段 15）。
- **验证**：`npm run test:run`。
- **commit**：`feat(simulator): 7.4 BUD 计算`。

### 7.5 BUD 实测验证（用户配合游戏实测）
- **改动**：拿英雄到游戏中看真实 BUD（游戏内显示），对照计算值，归档到 `docs/modules/planner/bud-verification.md`；偏差大则修正 BUD 公式。
- **测试**：实测偏差可接受（如 <30%）。
- **验证**：浏览器实测 + 文档归档。
- **commit**：`docs(planner): 7.5 BUD 实测验证`。

---

# 阶段 8：buff_upgrade wrapper 展开（top N·批判②）

**目标**：扩展 wrapper 解析（不全展开）。
**风险**：43 变体全展开过度（批判②），按覆盖率 top N。

### 8.1 评估 43 变体优先级
- **改动**：jq 统计各 buff_upgrade 变体频率（`buff_upgrade_add`/`_multiplicative`/`_add_then_mult`/`_per_unique_race`/`_add_flat_amount` 等），排优先级。
- **测试**：统计报告归档 `docs/modules/planner/buff-upgrade-priority.md`。
- **验证**：`jq` 统计完成。
- **commit**：`docs(data): 8.1 buff_upgrade 变体优先级评估`。

### 8.2 实现 top N 变体解析
- **改动**：扩展 `isPlannerBuffUpgradeKind`（:108）+ `resolvePlannerBuffUpgradeSeed`（:187）支持 top N 变体（覆盖率 >80%）；低频私有 stack（per_mithral_hall_stacks 等）记录但降级进 warning。
- **测试（先写）**：top N 变体解析为正确 bonusScaleOfSignal；低频的进 warning。
- **验证**：`npm run test:run`；coverage 显示 wrapper 解析率 >80%。
- **commit**：`feat(data): 8.2 实现 buff_upgrade top N 变体解析`。

### 8.3 改进 base signal 解析
- **改动**：排查剩 182 base 未解析的根因（base effect 本身 unsupported？引用断链？）。
- **测试（先写）**：原 unsupported 的 base 现在能解析。
- **验证**：`npm run test:run`；coverage base 解析率提升。
- **commit**：`feat(data): 8.3 改进 buff_upgrade base 解析`。

### 8.4 重跑 build + coverage 验证
- **改动**：重跑 build。
- **验证**：wrapper 解析率 60% → >85%；JSON 结构校验。
- **commit**：`chore(data): 8.4 重生成 planner model 含 buff_upgrade 展开`。

### 8.5 wrapper 稀有度去重 + bonusScale targeting 复用

**背景**：第三轮全链路审计（2026-07-21）发现两类 buff_upgrade 精细化缺口，前几轮审计只在关注点列表提"归阶段 8"但未落入执行步骤，本步补齐。

- **完全重复去重（已完成·不再做）**：`collectEffectEntries` 的 `derivedSignalKey` 已对完全相同 derived signal 去重（IC 装备系统同 buff 多条 effect 完全相同 upgrade，recognized 15409→12253，-20%）。见 commit b7d750f。
- **不同 magnitude 稀有度取最高（本步）**：同一 buff 不同稀有度有不同 magnitude（如 Jaheira `buff_upgrades,100/200/25/87.5/150/275/40/80,...`），游戏只生效最高稀有度；当前各 magnitude 全累加 → 高估。需按 `(英雄, base target, targetQualifier)` 分组，组内只保留最高 magnitude 的 wrapper。
- **bonusScale targeting 复用（本步评估）**：`resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时只取 base 的 multiplier，不重新校验 base 的 `positionQualifier` / `targetQualifier`（见下方关注点）；评估 base 与外层 targeting 不一致场景，决定是否在派生时继承/校验 base targeting。wrapper 自身 filter_targets 合并已实现（第四轮→f389586b）：`collectEffectEntries` 派生时 AND 合并 `normalizeTargetQualifier(wrapper effect)` 到 base targetQualifier（`mergeHeroQualifiers`），wrapper 的 `hero_ids` 白名单等不再丢失（真实样本：hero 82 `buff_upgrades` + `hero_ids:[82]`）。

- **测试（先写）**：同 base 不同 magnitude 的 wrapper 组只保留最高；bonusScale targeting 不一致场景分类与处理策略。
- **验证**：`npm run test:run`；`data:signal-coverage` 确认稀有度高估消除（重点核对 Lucius/Regis/Halsin/Jaheira 等 wrapper 大户）。
- **commit**：`fix(data): 8.5 wrapper 稀有度取最高 + bonusScale targeting 复用评估`。

---

# 阶段 9：scenario 规则 + schema

**目标**：scenario forced/banned/locked 从全空到部分填充；schema 防数据漂移。
**风险**：restrictions 是自由文本（留阶段 12）。

> 9.1 mechanics→lockedSlots 投影已完成 [x]，提前到 M1。

### 9.2 场景英雄限制（eligibility + game_change）→ forced/banned/allowed

**背景**：第三轮审计（2026-07-21）发现 `projectMechanicsToScenario` 只处理 escort（→lockedSlots），忽略 829 个 variant 的英雄限制 `game_change`（原 9.2 只提 eligibility→banned，漏了 game_change）：
- **force_use_heroes（327）**：`{hero_ids:[16]}` 强制使用 → 映射 `scenario.forcedHeroes`（下游 `forceInclude` 约束 recommendationEngine:186 已就绪）；但需 candidate pool 配合——强制英雄即使未拥有也纳入候选，否则用户无该英雄时该 variant 永远非法。
- **only_allow_crusaders（502）**：`{by_ids:{ids:[...]}, by_tags:{tags:"druid|barbarian|ranger"|"evil"|"small|dwarf|..."}}` 白名单 → 需 `allowedHeroes`/`allowedQualifier` 字段 + candidate 过滤；`by_tags` 用 `|` OR 同 `targets.tags` shorthand 方言，可复用 `parseHeroPredicate('shorthand')`。
- **slot_effects（91）/global_effects（296）**：场景级效果（weather damage / global dps reduce per area），不直接限英雄，归阶段 10 推图预估建模，本步不处理。

- **改动**：`projectMechanicsToScenario` 解析 `force_use_heroes` → forcedHeroes、`only_allow_crusaders` → allowedQualifier（by_ids 集合 + by_tags 谓词）；candidate pool 配合强制/白名单；championEligibility/patronEligibility 派生 banned；高价值变体 `semantic-overrides.json` 手工补。
- **测试（先写）**：force_use_heroes variant 的 forcedHeroes 非空且强制生效；only_allow_crusaders by_tags 白名单过滤候选；eligibility banned 生效；手工 override 生效。
- **验证**：`npm run test:run`；planner-scenarios 部分变体 forced/allowed/banned 非空。
- **commit**：`feat(data): 9.2 场景英雄限制 game_change 解析 + eligibility banned`。

### 9.3 champion-details zod schema + CI
- **改动**：新建 `src/domain/types/champion-details-schema.ts`（zod，覆盖核心字段，raw 用 `z.unknown()`）；CI 加 `data:validate-schema`。
- **测试（先写）**：schema 校验现有 163 文件通过；故意破坏字段被拦截。
- **验证**：`npm run test:run`；schema 拦截破坏。
- **commit**：`feat(data): 9.3 champion-details zod schema 校验`。

---

## M1 审计衍生的 M2 关注点

- `scoreFormation` 调用 `evaluatePlacementFit` 未显式传 `dimension: 'damage'`；M1 全员 damage 维度无影响，但 M2 引入 gold / crit 维度时必须显式过滤，否则非伤害 pool 会泄漏进 `carryDps`。
- `resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时只取 base 的 multiplier，不重新校验 base 的 `positionQualifier` / `targetQualifier`；阶段 8 buff_upgrade 精细化时需评估 base 与外层 targeting 不一致场景。
- **复合 amount_expr 未解析（20 条）**：`upgrade_amount(N,i)+upgrade_amount(N,i)+...`（5 条纯求和，Brig/Xerophon）、`max_upgrade_amount`/`mult_stack`/`feat_amount`/`upgrade_amount(N,dps_update)`（15 条运行时/命名 index）。全为 `hero_dps_multiplier_mult,0`，`resolveSimpleAmountExpr` 只匹配单一，复合回退得 effect 自身 value=0（低估，保守安全）。与 per_hero_expr 数值表达式同域，**归 `expression-evaluator-plan.md` 数值求值器**（`upgrade_amount` 与 `GetUpgradeAmount` 同类），不归本里程碑阶段 8。
- **buff_upgrades wrapper 重复去重（已修）/ 稀有度取最高（阶段 8）**：IC 装备系统把同一 buff 按装备槽/稀有度展开成多条 effect 完全相同的 upgrade（仅 id 不同）。第三轮审计发现 Jaheira 38 条 `buff_upgrades,100,9714,9715,9716,9717`（magnitude 全相同=非稀有度差异），每条派生 4 base signal → 152 重复（91% 过度计算）。`collectEffectEntries` 已加 `derivedSignalKey` 对完全相同 derived signal 去重（全库 recognized 15409→12253，-20%）。剩余「同一 buff 不同 magnitude 的稀有度版本取最高」仍归阶段 8 top-N / 稀有度去重。

- **未支持的 string target（第四轮审计·2026-07-21）**：`normalizeExplicitTargeting` 的 `STRING_RELATION_MAP` 未覆盖 `other`(56) / `self_slot`(24) / `area`(12) / `active_campaign`(7) / `edge` / `middle_columns` / `front_column` / `bud_setter` / `non_col` / `self_and_behind_and_ahead` 等；未支持者进 unsupportedSignals（保守安全，不静默当作已算）。`other` 语义 = 全队除 source（如 effect_def 214「提高所有其他勇士的生命值」），关联 carryDps effect 仅 2-3 处（`hero_dps_multiplier_mult` 等，余为 health/触发类），精确支持需 `positionQualifier` 增强 excludeSelf 语义，归未来 targeting 精细化。
- **filter_targets type 全量覆盖（第四轮审计）**：`normalizeTargetQualifier` 已接入 `hero_ids`/`exclude_heroes`（heroId AST，复用 `per_hero_expr` 的 `hero_id==N` 节点）；阵型聚合（`has_neighbour_with_tag`/`by_neighbours`/`dominant_affiliation` 等 ~13 处）+ 存档依赖（`affected_by_upgrade`/`not_affected_by_upgrade` 39 处）type 归 `expression-evaluator-plan.md` formationAggregate / 存档依赖节点；`limit_effect_def_per_hero_attack` / `limit_per_effect`（effect 叠加上限）归阶段 8 buff_upgrade 精细 / step simulation。当前 hero_ids 已在 wrapper 派生路径合并生效（f389586b，hero 82 等 wrapper 派生 signal +210 行带 heroId targetQualifier）；exclude_heroes 多因 base effect `targets:'other'` 进 unsupported，待 positionQualifier excludeSelf 增强后生效。全量登记见 `format-quirks.md`。

数据源格式坑（已在归一化层与代码处理，追源守则见 `AGENTS.md` §1.3）：`upgrade_defines.effect` 常是 JSON 对象串（含伪 JSON）；`effect_defines.targets.tags` 是布尔表达式（`|` / `^` / `!` / `()`）；`upgrade_amount(id,index)` 可跨 upgrade 引用；buff_upgrade wrapper 信号由 `collectEffectEntries` 派生；`STACK_COUNT_RESOLVERS` 与 `SCORING_SUPPORTED_STACK_FUNCS` 由 `scoringSupportSync.test.ts` 守护。
