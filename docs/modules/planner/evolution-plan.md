# 阵型模拟器演进规划 v4（中文标号·全缺口·UI 最后）

> 架构与演进设计，非执行手册。每步定边界/依赖/验证，逐步 commit。类型草案是设计意图。

## Context

用户感知"完成度 20–30%，完全不可用"。深度审计结论：**项目被严重低估，但"算法-UI 断层"真实存在**。Ralph 已交付 34/34 stories（332 tests）的第一条纵切；数据归一化（72%）和 carry-centric 评分内核 `placementFit.ts`（743 行）质量很高，但被困在"只输出 1 个文本结果、不画棋盘"的 UI 后面，英雄能力表达散落多处，算法与英雄耦合，且用角色权重假 score。

**用户核心目的**：自动化阵型模拟，以 owned 英雄为范围，确定 C 位后推荐最佳占位阵型推图。

**关键决策**：①第一刀做 Hero Ability 领域抽象层（算法-英雄分离）②质疑"评分"范式→三层架构（每种模式用真实目标量）③加成聚合层仔细处理各种加成④所有缺口必须列入 plan（不留"后续"）⑤UI 最后⑥去掉 isCarryViable 的 dps 角色判定⑦标号用中文层级⑧click damage 不纳入计算但作辅助参考值⑨MVP 忽略 BUD（用 DPS 近似）。

## 进度追踪（阶段级·中断后可续）

- [ ] 1 抽象层（1.0-1.13）
- [ ] 2 加成聚合+objective+baseDPS+spike（2.0-2.5）
- [ ] 3 金币（3.1-3.6）
- [ ] 4 crit（4.1-4.4）
- [ ] 5 health/survival（降级为推图约束，5.1-5.3）
- [ ] 6 vulnerability（6.1-6.4）
- [ ] 7 speed（条件性，B0 后决定，7.1-7.3）
- [ ] 8 buff_upgrade 展开（top N，8.1-8.4）
- [ ] 9 scenario+schema（9.1-9.3）
- [ ] 10 推图预估（10.1-10.3）
- [ ] 11 全局加成（11.1-11.4）
- [ ] 12 restrictions 解析（12.1-12.3）
- [ ] 13 装备精细（13.1-13.4）
- [ ] 14 click 辅助 + modron（14.1-14.3）
- [ ] 15 UI 接通（15.1-15.6·最后）
- [ ] 16 拖拽（16.1-16.5·最后）

> 步骤级 `[ ]`/`[x]` 执行时在每个步骤标题勾选。

## 三层架构（核心设计原则）

```
能力表达层（HeroAbility，阶段 1）    统一英雄能力模型，hero-agnostic
  ↓
加成聚合层（placementFit）            pool 结构：pool 内 add 相加/mult 相乘，pool 间乘法
  ↓
优化目标层（objective，模式特定）     C 位=maximize carryDps；金币=maximize teamGoldFind
  ↓
搜索层（beamSearch）                  按 objective 优化
```

**核心变化**：placementFit 降级为 pool 聚合器（不产出"评分"）；每种模式用真实目标量（GameNumber）；"score/heuristicRoleMultiplier"淘汰；baseDamage 接入（champion-details 有）。

## BUD 对阵型模拟的价值

BUD = 阵型近期最高单次伤害。- **阵型推荐（相对比较）**：帮助有限，**MVP 忽略 BUD 用 DPS**。
- **推图层数预估（绝对值）**：IC 怪物血量按 BUD 缩放；阶段 10 用 DPS 近似，标注"BUD 机制下可能偏差"。后续要精确再做 BUD 建模。

## 总体路线（v4·UI 最后·全缺口阶段化）

```
1 抽象层 → 2 加成聚合+objective+baseDPS（含 2.0 多英雄 spike）
  → 数据补全系列：3 金币 → 4 crit → 5 health → 6 vulnerability → 7 speed → 8 buff_upgrade
  → 9 scenario+schema
  → 补强：10 推图预估 → 11 全局加成 → 12 restrictions → 13 装备精细 → 14 click+modron
  → 15 UI 接通（最后）→ 16 拖拽（最后）
```

## 里程碑分组（大计划拆小计划·不限制 16 阶段死）

用户允许把大计划拆成几个小计划（里程碑），实事求是，阶段数可增减。当前按依赖分 4 个里程碑：

- **里程碑 1·核心引擎**：1 抽象层 + 9.1（mechanics 提前）+ 2 加成聚合+objective+baseDPS+BUD spike。产出：真实 carryDps/BUD 计算能力。
- **里程碑 2·数据补全**：3 金币 + 4 crit + 5 health + 6 vulnerability + 7 speed+BUD + 8 buff_upgrade + 9.2/9.3 scenario/schema。产出：所有 effect 类型进 pool。
- **里程碑 3·补强**：10 推图预估 + 11 全局加成 + 12 restrictions + 13 装备精细 + 14 click+modron。产出：推荐准确 + 推图预估 + 辅助信息。
- **里程碑 4·UI**：15 接通 + 16 拖拽。产出：用户可见可用。

每个里程碑可独立验证、独立交付价值。里程碑之间可插入新阶段（如发现遗漏），不把 16 阶段限制死。

## 顺序评估（v4 审查结论）

当前顺序按依赖拓扑 + 用户优先级（金币是第二刀）排。评估结论：**顺序基本合理**，可选小调整：
- **9.1 已提前**到 1 之后（scenario 规则影响所有推荐）——正确。
- **2.0 spike 前置**（公式验证）——正确。
- **数据补全内部顺序**：当前 3 金币 → 4 crit → 5 health → 6 vulnerability → 7 speed → 8 buff_upgrade。**可选调整**：vulnerability（进 DPS）提前到 health（约束）前——因 vulnerability 直接进 DPS，health 是约束（依赖推图预估）。差距小，不强求，执行中按需调整。
- **10 推图预估依赖 7.4 BUD + 5 survival**：当前在 7 之后，正确。
- **13 装备精细**依赖 2 baseline，在补强系列末尾（MVP 近似够用，精确装备后置）。
- **结论**：保持当前顺序，执行中如发现依赖问题再调整。

## 关键架构决策

1. **演进式重构**：`PlannerEffectSignal` → `HeroAbilitySignal`，字段零修改。
2. **dimension 扩展位**：`HeroAbilityDimension`（damage/gold/crit/survival/vulnerability/speed/cooldown/ultimate/utility/global-buff）+ `DIMENSION_BY_KIND`。
3. **算法-英雄握手点唯一**：`HeroAbilityProfile`。
4. **build→JSON→runtime 边界**：类型 `src/domain/abilities/*.ts`，共享语义 `.js+.d.ts`，build 留 `scripts/data/`。
5. **死代码删除**：`effectParser.ts`/`championSimulationProfile.ts`。
6. **三层架构**：能力表达/加成聚合/优化目标分层。
7. **"评分"淘汰**：用真实数值（`carryDps = baseDamage × levelCurve × pool 聚合`）。
8. **命名（v5·实事求是·用户明确 A1·不留历史包袱）**：**去掉不适合的 Planner 前缀**。原则：**通用符号（英雄能力/数据）去 Planner，专属模块（推荐引擎）保留**。
   - **abilities 层全部去 Planner**：类型（`PlannerEffectSignal`→`HeroAbilitySignal` 等）、函数（`matchesPlannerHeroQualifier`→`matchesHeroQualifier`、`attachPlannerSignalSemantics`→`attachSignalSemantics`、`normalizePlannerEffectSignal`→`normalizeEffectSignal`、`resolvePlannerModel`→`resolveHeroAbilityProfiles`、`buildOfficialPlannerHeroModel`→`buildOfficialHeroAbilityProfile` 等；`getRolePriorityMultiplier` 随 heuristic 淘汰删除）、文件（`plannerSignalSemantics.js`→`signalSemantics.js`、`plannerQualifierParsing.js`→`qualifierParsing.js`、`planner-effect-helpers.mjs`→`effect-helpers.mjs`、`build-planner-models.mjs`→`build-models.mjs`、`planner-signal-coverage.mjs`→`signal-coverage.mjs`）。
   - **JSON 产物按通用性改名**：`planner-heroes.json`→`hero-abilities.json`、`planner-scenarios.json`→`scenarios.json`、`planner-semantic-overrides.json`→`semantic-overrides.json`；IndexedDB key（`plannerHeroOverrides`/`planner-heroes`/`planner-scenarios`）同步改名，旧 key 清理（用户本地数据因 schema 变化重建，可接受）。
   - **planner 推荐引擎模块保留**（`src/domain/planner/`：recommendationEngine/beamSearch/steadyStateScoring/candidatePool/placementFit 是"阵型推荐引擎"职责，`planner` 命名在此准确）；内部引用通用数据时用新名。
   - 执行时全面搜索 `Planner`/`planner` 残留，逐个评估：通用符号去前缀，专属模块保留。阶段 1 的 1.4-1.8/1.11 涵盖函数/文件/JSON 改名。

## v2.1 设计修正（审查优化·已采纳）

1. **baseDamage 在 1（抽象层）接入**：1.2 加字段 + 1.8 build 提取；2 只做 carryDps 计算。
2. **9.1（scenario mechanics→lockedSlots）提前到 1 之后、2 之前**。
3. **去掉 isCarryViable 的 dps 角色判定**（`build-planner-models.mjs:79`）。所有英雄作为 carry/加成候选，让实际加成能力决定。
4. **objective 简化**（Ponytail）：2.1 不强枚举 ObjectiveKind。
5. **heuristicRoleMultiplier 清理**：2.4/2.5 删死字段。
6. **2.0 多英雄公式验证 spike**。
7. **codegraph reindex**：1.13 后。

## 加成聚合层调研结论（指导阶段 2）

### 当前错误基础（纯累乘无 pool）
`fitScore = ∏ m_s`，value 无条件当百分比，无 pool 分隔。~3000+ effect 被丢。

### pool 结构（来自数据）
- **顶级 pool = `kind`**：当前只产出 heroDps/globalDps。
- **pool 内 add/mult**（`amountFunc`）：add/默认 → Σ percent；mult → Π multiplier。
- **pool 间乘法**。
- **特殊 pool**：`formation_effect`/`static_dps_only`/`manual_bonus_calc`/`not_buffable`。
- mult 只占 2.8%（209/7535），add 是主体。

### 真实 DPS 公式（阶段 2 目标）
```
hero_final_dps = base_dps
  × global_dps_pool        // Σ(add) → Π(mult)
  × hero_dps_pool
  × Π(formation_effects)
  × Π(static_dps_mults)
  × crit_factor            // 1 + Σ(crit_chance)·(crit_damage_mult−1)   [阶段 4]
  × Π(enemy_vulnerability) // [阶段 6]
```

### unit 字段
`HeroAbilitySignal.unit: 'percent'|'flat'|'boolean'`（默认 percent，`buff_upgrade_add_flat_amount` 是 flat）。

### 调研已确认
- **speed**：`attack_speed_mult` 影响 Attack Timer，hero_dps 按秒，`time_scale_cap.cap=10`。
- **ultimate**：`ultimate_damage_params.dps_based=true`，ult 派生自 BUD/DPS，不需独立 pool。
- **baseGold**：`idle_gold_rate:0.25/0.5` + `monster_base_stats.base_dps:1` + `dps_growth_rate_curve`。
- **crit 默认**：`default_hero_crit_chance:2.5`/`default_hero_crit_damage:100`。

---

# 阶段 1：Hero Ability 领域抽象层（纯重构）

**目标**：英雄能力表达统一到 `src/domain/abilities/`，算法-英雄分离。纯重构，行为零变化（JSON 字节一致）。baseDamage 在此接入（v2.1①）。

**边界**：不改评分逻辑/UI/JSON 产出/功能。只 rename/move/delete/加枚举位 + baseDamage 接入 + isCarryViable 修正。

**目标目录树**：`src/domain/abilities/`（abilityModel.ts/signalSemantics.js+.d.ts/qualifierParsing.js+.d.ts/README.md）；`src/domain/planner/scenarioModel.ts`；删除 `effectParser.ts`/`championSimulationProfile.ts`。

**已确认改动面**：1.4 caller 5 处；1.5 caller 1 处；1.6 类型名替换影响 placementFit(~12)/steadyStateScoring/recommendationTypes/recommendationEngine；candidatePool/hypotheticalBaseline 不改；1.7 含 plannerOverridesStore；1.10 死代码零生产 caller。

### 1.0 基线快照
- 记录 `shasum planner-{heroes,scenarios}.json` + fixture 推荐输出 + 测试通过数（332）。验证全绿。顺手建 `CLAUDE.md` 符号链接 + 修 TODO.md。

### 1.1 建 abilities 目录 + README 骨架
- 新建 `src/domain/abilities/README.md`（定位/入口/不变量/边界/依赖方向/函数名取舍）。

### 1.2 提取 abilityModel.ts（类型 + resolver + baseDamage 字段）
- 新建 `src/domain/abilities/abilityModel.ts`：`HeroAbilityDimension`/`DIMENSION_BY_KIND`/`HeroAbilityKind`/`HeroAbilitySource`/`HeroQualifier`/`HeroPositionRelation`(27)/`HeroAbilitySignal`（字段零修改 + 加 `unit` 字段）/`HeroAbilityProfile`（**加 `baseDamage: number`** + 去 isCarryViable 的 dps 判定逻辑）/`applyHeroAbilityPatch`/`resolveHeroAbilityProfiles`。plannerModel 不动（双份共存）。
- **测试（先写）**：resolver 形态；patch 优先级；DIMENSION_BY_KIND 映射；HeroAbilityDimension 预留值；baseDamage 字段存在。

### 1.3 拆出 scenarioModel.ts
- 新建 `src/domain/planner/scenarioModel.ts`（`PlannerScenarioSlot`/`OfficialPlannerScenarioModel`/`findPlannerScenarioForVariant`）；plannerModel 加 `export *` 兼容。

### 1.4 搬 signalSemantics 到 abilities
- `git mv` + 改内部 import + 改 5 caller（planner-effect-helpers.mjs:13/placementFit.ts:8/build-planner-models.mjs:4/planner-signal-coverage.mjs:10/测试含 :252 动态 import）。
- 验证 JSON 与 1.0 baseline 字节一致。

### 1.5 搬 qualifierParsing + 补 .d.ts
- `git mv` + 新建 `qualifierParsing.d.ts`（对照 .js 校验签名）。

### 1.6 planner 算法层迁移到 abilities 类型（逻辑零修改）
- placementFit.ts（~12 处类型名替换，最先）/steadyStateScoring/recommendationTypes/recommendationEngine。candidatePool/hypotheticalBaseline 不改。`matchesPlannerHeroQualifier` 不改名。

### 1.7 数据层迁移
- `src/data/plannerModel.ts` + `plannerOverridesStore.ts:1`（`PlannerHeroOverridePatch→HeroAbilityOverridePatch`）。函数名保留。

### 1.8 build 脚本迁移 + baseDamage 提取（v2.1①）
- 复核 3 脚本 import 路径 + **从 champion-details 读 baseDamage 写入 planner-heroes.json**。

### 1.9 build 验证 JSON 字节一致（baseDamage 除外）
- shasum 比对（baseDamage 是新增字段，JSON 会变，除 baseDamage 外字节一致）。

### 1.10 删除死代码
- `git rm` effectParser.ts/championSimulationProfile.ts + 3 测试。

### 1.11 清理 plannerModel shim + 收口 resolver
- `resolvePlannerModel` 拆成 `resolveHeroAbilityProfiles` + scenarios 直传。

### 1.12 补 README + 同步文档命名
- abilities/README 完整化；planner/README；批量 replace `docs/modules/planner/*.md` 类型名。

### 1.13 浏览器手验行为一致 + codegraph reindex（v2.1⑦）
- `/planner` fixture 推荐与 1.0 baseline 一致；`codegraph init` 重新索引。

---

# 阶段 2：加成聚合 pool + objective + base DPS（核心）

**目标**：placementFit 从纯累乘改为 pool 结构；引入真实目标量 carryDps；淘汰 heuristicRoleMultiplier。**2.0 多英雄 spike 前置降低返工**。

### 2.0 多英雄 carryDps 公式验证 spike（前置·用户明确建议）
- 选 3-5 个英雄（C 位 + adjacent/global/tagged/stack 各类辅助，如 Bruenor + 一个 dps carry + 2-3 辅助）。
- 手工收集 baseDamage/level/equipment/carrySignals/supportSignals。
- 手工算 pool 聚合 + carryDps，对照 byteglow/kleho 社区数据。
- 记录公式/计算/偏差到 `docs/modules/planner/carry-dps-formula-spike.md`。
- **数据源确认（批判①）**：确认 byteglow 哪个页面给单英雄 DPS；选有明确数据的英雄。
- 偏差 <30% 可接受（社区数据含未建模因子）。偏差大先修正公式。

### 2.1 objective 类型（简化·不强枚举 ObjectiveKind）
- 新建 `src/domain/planner/objectiveModel.ts`：`ObjectiveResult { value: GameNumberValue; breakdown: ObjectiveBreakdownPart[] }`。不强枚举 ObjectiveKind（Ponytail）。

### 2.2 base DPS 计算（carryDps）
- 新建 `src/domain/simulator/baseDps.ts`：`computeCarryDps(hero, level, damageAggregate) = baseDamage × levelCurve(level) × aggregate`。
- levelCurve 从 `costCurves` 派生（MVP 简化，标注 ponytail）。
- 激活 `gameNumberArithmetic`（当前死代码）。
- **数据源确认（批判①）**：确认 levelCurve 用 costCurves 还是 game-rules。

### 2.3 加成聚合层重构为 pool 结构（最复杂）
- `HeroAbilitySignal.unit` 字段（1.2 已加）。
- placementFit 重构：按 kind 分 pool（global/hero）；pool 内 add→Σ/mult→Π；pool 间乘法；返回 `PoolAggregateResult`；加 `dimension` 入参；保留 bonusScaleOfSignal/stackFunc。
- **测试（先写）**：pool 内 add 相加/mult 相乘/pool 间乘法/新结果≠旧 fitScore/dimension 过滤/嵌套+stack。

### 2.4 steadyStateScoring 改为 objective 驱动 + 去除 isCarryViable 限制（v2.1③）
- 起步值 `heuristicRoleMultiplier` → `computeCarryDps`；score `number→GameNumberValue`；返回 `ObjectiveResult`；beamSearch 用 `compareGameNumbers`。
- **去除 isCarryViable 的 dps 判定**：枚举所有已放置英雄作为 carry 候选（不限 isCarryViable），让 carryDps 决定。
- 删 `build-planner-models.mjs:24/67/79/80` 的 `getRolePriorityMultiplier`/`heuristicRoleMultiplier`/`roles.has('dps')`。

### 2.5 统一解释语义 + Top K
- 删 `ROLE_PRIORITY`/`ROLE_LABELS`/`getRolePriorityScore`/`getChampionRoleSummary`。
- `buildPlannerExplanations` 用 carryDps + breakdown。
- `results.find(top)` → `slice(0, PLANNER_TOP_K)`（新建 `plannerConstants.ts`）。
- 输出 `PlannerRecommendationSet`（carryRanking/topLineups/slotAlternatives/seatCompetition）。

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
- **改动**：`planner-effect-helpers.mjs:463 normalizePlannerEffectSignal` 加 gold 分支（`gold_multiplier_mult`→globalGoldMultiplier；`gold_mult_per_tagged_crusader_mult`→+stackFunc；`gold_mult_per_target_crusader`→参照 :524 模式）。
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
- **改动**：`normalizePlannerEffectSignal` 加 crit 分支（`buff_base_crit_chance_add/mult`/`global_buff_base_crit_*`/`buff_base_crit_damage_*`/`critical_click_*`，~200 条）。
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
- **改动**：`normalizePlannerEffectSignal` 加 health/healing/damage_reduction 分支（`health_mult`/`health_add`/`healing_mult`/`global_health_mult`，~580 条；`damage_reduction*` ~40）。
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
- **改动**：`normalizePlannerEffectSignal` 加 vulnerability 分支（`damage_increase`/`increase_damage_against_monster*`/`increase_armored_damage`/`bonus_armored_damage`，~150 条）。
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
- **改动**：`normalizePlannerEffectSignal` 加 speed 分支（`attack_speed_mult`/`reduce_attack_cooldown`/`reduce_ultimate_cooldown`/`ability_cooldown_reduction_mult`，~2000 条）。
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

# 阶段 9：scenario 规则 + schema（9.1 提前·v2.1②）

**目标**：scenario forced/banned/locked 从全空到部分填充；schema 防数据漂移。
**风险**：restrictions 是自由文本（留阶段 12）。

### 9.1（提前到 1 之后、2 之前）mechanics→lockedSlots 投影
- **改动**：`build-planner-models.mjs:121-150 buildOfficialPlannerScenarioModel` 从 mechanics（`slot_escort`/`boss`/`hits_based`）派生 lockedSlots/scenarioWarnings；去掉 :143-148 硬编码 warning。
- **测试（先写）**：mechanics slot_escort → lockedSlots 标记；boss → scenarioWarnings。
- **验证**：`npm run test:run`；重跑 build 后部分变体 lockedSlots 非空。
- **commit**：`feat(data): 9.1 mechanics→lockedSlots 投影`。
- **执行时机**：阶段 1 之后、2 之前。

### 9.2 championEligibility → banned + 手工 override
- **改动**：从 championEligibility/patronEligibility 派生 banned；高价值变体用 `planner-semantic-overrides.json` 手工补 forced/banned。
- **测试（先写）**：eligibility banned 生效；手工 override 生效。
- **验证**：`npm run test:run`；planner-scenarios 部分变体 banned 非空。
- **commit**：`feat(data): 9.2 eligibility→banned 与手工 override`。

### 9.3 champion-details zod schema + CI
- **改动**：新建 `src/domain/types/champion-details-schema.ts`（zod，覆盖核心字段，raw 用 `z.unknown()`）；CI 加 `data:validate-schema`。
- **测试（先写）**：schema 校验现有 163 文件通过；故意破坏字段被拦截。
- **验证**：`npm run test:run`；schema 拦截破坏。
- **commit**：`feat(data): 9.3 champion-details zod schema 校验`。

---

# 阶段 10：推图层数预估（BUD/carryDps vs monster·批判①）

**目标**：预估"能推到第几层"，服务"方便推图"。
**风险**：怪物 health 数据源未确认（批判①）；BUD 机制下 DPS 近似有偏差（用 BUD 更准）。

### 10.1（数据源确认）怪物 stats 数据源
- **改动**：确认 `monster_base_stats` 的 health 字段（若有）或 monster properties；确认 `dps_growth_rate_curve` 用法。
- **测试**：数据源确认报告归档。
- **验证**：`jq monster_base_stats` 确认 health/血量字段。
- **commit**：`docs(data): 10.1 怪物 stats 数据源确认`。

### 10.2 推图预估算法
- **改动**：新建 `src/domain/planner/areaEstimation.ts`：二分查找 `max area where BUD（或 carryDps）>= monster_stat(area)`（stat 按 10.1 确认）；结合 survival 约束（阶段 5）。
- **测试（先写）**：高 BUD 阵型预估层数 > 低 BUD；survival 不足时受限。
- **标注**：基于 BUD（7.4）预估更准；若 BUD 未做完用 DPS 近似（标注偏差）。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 10.2 推图层数预估算法`。

### 10.3 UI 展示 + 测试
- **改动**：阶段 15 UI 展示"预估可推到第 X 层"。
- **测试**：UI 显示预估层数。
- **验证**：`npm run test:run` + 浏览器（阶段 15 联动）。
- **commit**：`feat(planner): 10.3 推图预估 UI 接入`（阶段 15 执行）。

---

# 阶段 11：全局加成（blessings + patron-perks·批判①）

**目标**：全局 pool 进 DPS。
**风险**：blessings 数据可能缺失（批判①）；patron-perks effect 结构未确认。

### 11.1（数据源确认）blessings 调查
- **改动**：检查 `UserProfileSnapshot` 有无 blessings；campaign/adventure 有无 favor；`blessings.json` 缺失确认。
- **测试**：调查报告归档。
- **验证**：`jq UserProfileSnapshot` + campaign 数据。
- **commit**：`docs(data): 11.1 blessings 数据源调查`。

### 11.2（数据源确认）patron-perks effect 结构
- **改动**：确认 patron-perks 的 effect 结构（perk 怎么给 DPS 加成？看 `patron-perks.json` 的 effect 字段）。
- **测试**：结构确认报告。
- **验证**：`jq patron-perks` 确认 effect。
- **commit**：`docs(data): 11.2 patron-perks effect 结构确认`。

### 11.3 扩 kind + 解析
- **改动**：`HeroAbilityKind` 加 `blessingMult`/`patronPerkMult`；dimension `global-buff`；解析 patron-perks（+ blessings 若 11.1 可行）。
- **测试（先写）**：解析正确。
- **验证**：`npm run test:run`；coverage 显示 global-buff。
- **commit**：`feat(data): 11.3 解析 patron-perks/blessings effect`。

### 11.4 全局 pool 进 DPS
- **改动**：`final_dps × global_buff_pool`；接入 pool 链。
- **测试**：含全局加成的 carryDps > 不含。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 11.4 全局 pool 进 DPS`。
- **条件**：若 11.1 确认 blessings 不可做，只做 patron-perks。

---

# 阶段 12：restrictions 文本解析（手工模板·批判③）

**目标**：restrictions 文本规则结构化（mechanics 之外的补充）。
**风险**：中英自由文本 NLP 不可靠（批判③），用关键词模板。

### 12.1 评估高频模式
- **改动**：jq 统计 restrictions 文本高频模式（escort/cursed/banned/occupied/stunned 等）。
- **测试**：统计报告归档。
- **验证**：jq 统计完成。
- **commit**：`docs(data): 12.1 restrictions 高频模式评估`。

### 12.2 模板匹配解析器（不 NLP）
- **改动**：新建 `scripts/data/restrictions-parser.mjs`：高频关键词模板匹配（中英）→ forced/banned/locked；**不用 NLP**。
- **测试（先写）**：高频模式（如"四格被小鸡占据"→ lockedSlots 4）匹配正确；无法匹配的进 warning。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 12.2 restrictions 模板匹配解析器`。

### 12.3 高频变体校验 + 手工补
- **改动**：高频变体 rules 手工校验；低频的记录但手工补到 `planner-semantic-overrides.json`。
- **测试**：校验通过。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 12.3 restrictions 校验与手工补`。

---

# 阶段 13：装备/feat/传奇精细乘数（批判①）

**目标**：用真实装备替换 hypotheticalBaseline 近似。
**风险**：equipment 曲线数据源未确认（批判①）。

### 13.1（数据源确认）equipment 曲线
- **改动**：确认 ilvl/rarity 乘数曲线数据源（loot 数据？game-rules？effect-reference？）。
- **测试**：确认报告。
- **验证**：jq loot/game-rules 找曲线。
- **commit**：`docs(data): 13.1 equipment 曲线数据源确认`。

### 13.2 提取真实 equipment/feat/legendary
- **改动**：从 `UserProfileSnapshot.ownedChampions` 提取 equipment（slot/rarity/ilvl）/feats/legendaryLevels。
- **测试（先写）**：提取字段完整。
- **验证**：`npm run test:run`。
- **commit**：`feat(data): 13.2 提取真实装备数据`。

### 13.3 multiplier 计算
- **改动**：新建 `src/domain/simulator/equipmentMult.ts`：equipment/feat/legendary multiplier（按 13.1 曲线）。
- **测试（先写）**：multiplier 计算正确（高 ilvl > 低 ilvl）。
- **验证**：`npm run test:run`。
- **commit**：`feat(simulator): 13.3 装备/feat/传奇 multiplier 计算`。

### 13.4 接入 carryDps
- **改动**：`carryDps = baseDamage × levelCurve × equipment_mult × feat_mult × legendary_mult × pool`；替换 hypotheticalBaseline 近似。
- **测试**：真实装备的 carryDps ≠ 中位近似。
- **验证**：`npm run test:run` + 对照真实游戏（用户配合）。
- **commit**：`feat(planner): 13.4 装备乘数接入 carryDps`。

---

# 阶段 14：click 辅助 + modron（click 不纳入计算·用户明确）

**目标**：click damage 作辅助参考值展示；modron 辅助信息。
**边界**：click 不参与阵型模拟计算。

### 14.1 click damage 计算
- **改动**：新建 `src/domain/simulator/clickDamage.ts`：`click_damage = BUD × click_seconds`（派生自 BUD/DPS，`click_damage_seconds_global_dps`）。
- **测试（先写）**：click damage 计算正确。
- **验证**：`npm run test:run`。
- **commit**：`feat(simulator): 14.1 click damage 计算`。

### 14.2 click 辅助展示（不纳入模拟）
- **改动**：阶段 15 UI 展示 click damage（辅助参考值，尽可能准确）；**不参与阵型评分/排序**。
- **测试**：UI 显示 click damage；click 不影响推荐排序。
- **验证**：`npm run test:run` + 浏览器（阶段 15）。
- **commit**：`feat(planner): 14.2 click damage 辅助展示`（阶段 15 执行）。

### 14.3 modron 辅助信息
- **改动**：从 `game-rules.max_modron_auto_reset_area` 评估 modron reset 节奏；UI 展示"建议 modron reset 第 X 层"（辅助）。
- **测试**：modron 信息展示。
- **验证**：`npm run test:run`。
- **commit**：`feat(planner): 14.3 modron 辅助信息展示`（阶段 15 执行）。

---

# 阶段 15：UI 接通（最后）

**目标**：objective 引擎 + 所有数据补全完成后，UI 接通让能力可见。
**风险**：复用 FormationBoardGrid 不能破坏 formation 编辑器（15.1 最复杂）。

### 15.1 抽 FormationBoardCanvas + 棋盘渲染
- **改动**：抽 `src/pages/formation/FormationBoardCanvas.tsx`（纯渲染：slots + placements + championById + carrySlotId）；`FormationBoardGrid.tsx` 改组装 Canvas + formation 专属控件；`PlannerResultCard.tsx` 用 Canvas 渲染 top1 + carryDps + carry 标记。
- **测试（先写）**：Canvas 组件测试；PlannerResultCard 渲染棋盘；formation 全量回归。
- **验证**：`npm run test:run` + `test:e2e`（formation 不破）+ 浏览器。
- **commit**：`feat(planner): 15.1 棋盘 Canvas 抽取与结果卡片复用`。

### 15.2 Top K + carryRanking + 推图预估展示
- **改动**：新建 `PlannerTopLineups.tsx`/`PlannerCarryRanking.tsx`；消费 PlannerRecommendationSet；展示推图层数预估（10）+ survival 约束（5）。
- **测试**：组件测试覆盖 Top K 切换/carry 列表/预估展示。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 15.2 Top K + carryRanking + 推图预估展示`。

### 15.3 候选模式控件
- **改动**：`usePlannerPageModel` 加 candidateMode；`buildPlannerRecommendation` 加 options；接通 hypotheticalBaseline；新建 `PlannerCandidateMode.tsx`。
- **测试**：三档切换改变 candidatePool；all-hypothetical 走 hypotheticalBaseline。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 15.3 候选模式控件`。

### 15.4 C 位指定 + 锁槽控件
- **改动**：`usePlannerPageModel` 加 lockedCarryHeroId/lockedSlots；`buildPlannerRecommendation` 加 options；新建 `PlannerCarryLock.tsx`/`PlannerSlotLock.tsx`；所有英雄候选（不限 dps）。
- **测试**：指定 carry 时结果 carryHeroId 一致；锁槽不被替换。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(planner): 15.4 C 位指定与锁槽控件`。

### 15.5 推荐结果导入阵型编辑器
- **改动**：`PlannerSavePreset.tsx` 旁加导入动作；写 formationDraft（复用 formationDraftStore）；跳转 /formation。
- **测试**：E2E planner → formation 导入。
- **验证**：`npm run test:e2e`。
- **commit**：`feat(planner): 15.5 推荐结果导入编辑器`。

### 15.6 浏览器手验闭环
- **验证**：`npm run dev`，/planner 跑通全链路；`npm run test:regression`。
- **commit**：无。

---

# 阶段 16：拖拽（最后）

**目标**：阵型编辑器拖拽重做。
**边界**：移动端无原生 DnD，用 tap-target。

### 16.1 HeroPicker 选择器
- **改动**：新建 `src/pages/formation/HeroPicker.tsx`（搜索/分组/头像，替代 select）；FormationBoardGrid 改用 HeroPicker。
- **测试（先写）**：搜索过滤/分组/选中/灰显。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(formation): 16.1 HeroPicker 选择器`。

### 16.2 拖拽 API（HTML5 DnD）
- **改动**：HeroPicker 英雄卡 draggable；FormationBoardGrid slot 设 drop target；drop 调 handleAssignChampion。
- **测试（先写）**：dragstart 设 dataTransfer；drop 触发 handleAssignChampion。
- **验证**：`npm run test:run` + 浏览器。
- **commit**：`feat(formation): 16.2 拖拽 API`。

### 16.3 拖拽放入/替换/移除/槽位间
- **改动**：放入/替换/槽位间拖动（原子清原 slot）/拖出移除；seat 冲突实时提示。
- **测试（先写）**：E2E 拖拽主链路 + seat 冲突。
- **验证**：`npm run test:e2e` + 浏览器。
- **commit**：`feat(formation): 16.3 拖拽交互`。

### 16.4 移动端 tap-target + HeroPicker 弹层
- **改动**：FormationMobileEditor 接 HeroPicker；responsive.css ≤720px。
- **测试**：移动端 tap → 弹出 → 选择。
- **验证**：Playwright mobile viewport。
- **commit**：`feat(formation): 16.4 移动端适配`。

### 16.5 浏览器手验
- **验证**：桌面 + 移动端手验拖拽主链路；`npm run test:regression`。
- **commit**：无。

---

# 全局约束

- **commit**：中文 Conventional Commits，每步一 commit。
- **验证基线**：每步 `npm run test:run && typecheck && build`；数据步骤加 `data:planner-coverage`；UI 加组件/E2E + 浏览器。
- **回归关卡**：每阶段 `npm run test:regression`。
- **TDD（硬约束·用户明确）**：**大阶段必须 TDD**（先写测试再实现，测试全程保持通过，不得为通过测试而削弱断言）；小步骤（1.x / 1.x.x）涉及逻辑的必须 TDD，纯 rename/move/delete 的机械步骤可豁免（但有 characterization 测试保护）。每个阶段完成的标志 = 测试绿 + 行为可验证。
- **codegraph**：`.codegraph/` 已就绪，1.13 后 reindex。
- **不变量**：算法-英雄握手点唯一；unsupported 只进 warning；每种模式真实目标量；UI 最后。
- **拆分**：plan mode 单文件限制，保持本文件；执行阶段（ExitPlanMode 后）可拆到 `docs/modules/planner/`（每阶段一文件 + 主索引）。

## 后置

- 建 `CLAUDE.md` 符号链接（1.0 顺手）。
- 修 `TODO.md` 2 个 pre-existing 测试（1.0 顺手）。
- 完成后总结"三层架构 + dimension 扩展位 + objective 真实目标量 + 全缺口阶段化"经验到仓库经验教训文档。

## v4 最终审计补充（多维度审计·边缘遗漏·已落入相关阶段）

最终审计（一致性/批判性/想象力/可行性/逻辑性）结论：**plan 整体健全**，3 个边缘遗漏补充如下：

1. **真实伤害（% max health）**：IC 的 `damage_enemies`/`damage_hero_percent` 是按最大生命值百分比的伤害（非绝对数值）。**处理**：玩家侧（`damage_hero_percent`）归阶段 5 survival 的伤害输入；怪物侧（英雄对怪物 `damage_enemies`）归阶段 6 vulnerability 或独立"真实伤害 pool"（按场景评估）。不单独开阶段，在 5/6 实现时吸收。

2. **favor（战役声望）**：影响金币预算（baseline）与 blessing 解锁。**处理**：归阶段 11（全局加成）+ 阶段 2 baseline 的金币预算输入。11.1 blessings 调查时一并确认 favor 数据源（`UserProfileSnapshot.favorByCampaign`）。

3. **BUD 的 attack_interval 数据源**：7.4 BUD 计算用 `attack_interval`，数据来自 `champion-details.attacks.base.cooldown`。**处理**：7.1 解析 speed effect 时一并提取 `attack_interval`（从 `attacks.base.cooldown`），供 7.4 使用。

**一致性**：阶段 7/15/16 格式已统一为 ### 标题（原列表项）。

**想象力**：dimension 枚举位 / scoringMode 多模式 / planner-semantic-overrides + 浏览器本地 override 均为未来扩展留位（新英雄/新 effect/用户自定义）。

**可行性**：每步可执行；数据源未确认的有专门确认步骤（批判①）；BUD/crit 公式有 spike（2.0）+ 实测（7.5）兜底。

**逻辑性**：依赖顺序合理（顺序评估已论证）；阶段间数据流清晰（每阶段产出 signal/pool/data 给下游）；5.3 survival→10 推图预估的跨阶段依赖已标注。

## 待确认（执行前可调整）

- **Q1 命名（已决定·A1）**：通用符号去 Planner（abilities 层 + JSON + 脚本 + IndexedDB），planner 推荐引擎模块保留。见架构决策 8。
- **Q2 levelCurve（已决定·A2 用户授权）**：MVP 简化（`costCurves` 派生），2.2 数据源确认。
- **Q3 baseGold（已决定·A3 用户授权）**：`idle_gold_rate_v2 × monster_gold_by_area`（3.4）。
- **Q4 拖拽（已决定·A4 用户授权）**：HTML5 原生 DnD，移动端 tap-target。
