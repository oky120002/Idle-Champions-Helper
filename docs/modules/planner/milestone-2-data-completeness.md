# 里程碑 2·数据补全

- 作用：M2 执行步骤清单；产出所有 effect 类型进 pool。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 3-8、9.2 / 9.3 待做 [ ]；9.1 已完成（提前到 M1，见 `milestone-1-core-engine.md`）。

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

---

# 阶段 9：scenario 规则 + schema

**目标**：scenario forced/banned/locked 从全空到部分填充；schema 防数据漂移。
**风险**：restrictions 是自由文本（留阶段 12）。

> 9.1 mechanics→lockedSlots 投影已完成 [x]，提前到 M1（见 `milestone-1-core-engine.md`）。

### 9.2 championEligibility → banned + 手工 override
- **改动**：从 championEligibility/patronEligibility 派生 banned；高价值变体用 `semantic-overrides.json` 手工补 forced/banned。
- **测试（先写）**：eligibility banned 生效；手工 override 生效。
- **验证**：`npm run test:run`；planner-scenarios 部分变体 banned 非空。
- **commit**：`feat(data): 9.2 eligibility→banned 与手工 override`。

### 9.3 champion-details zod schema + CI
- **改动**：新建 `src/domain/types/champion-details-schema.ts`（zod，覆盖核心字段，raw 用 `z.unknown()`）；CI 加 `data:validate-schema`。
- **测试（先写）**：schema 校验现有 163 文件通过；故意破坏字段被拦截。
- **验证**：`npm run test:run`；schema 拦截破坏。
- **commit**：`feat(data): 9.3 champion-details zod schema 校验`。
