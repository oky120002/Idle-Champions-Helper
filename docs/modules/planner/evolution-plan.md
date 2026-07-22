# 阵型模拟器演进规划（总纲）

> 架构决策、进度追踪与全局约束。16 阶段详细执行步骤按里程碑拆分到 `milestone-2-data-completeness.md` / `milestone-3-enhancement.md` / `milestone-4-ui.md`（M1 已完成）；M1 审计衍生的 M2 关注点见 `milestone-2-data-completeness.md` 末尾。

## Context

用户感知“完成度 20–30%，完全不可用”。深度审计结论：**项目被严重低估，但“算法-UI 断层”真实存在**。Ralph 已交付 34/34 stories（332 tests）的第一条纵切；数据归一化（72%）和 carry-centric 评分内核 `placementFit.ts`（743 行）质量很高，但被困在“只输出 1 个文本结果、不画棋盘”的 UI 后面，英雄能力表达散落多处，算法与英雄耦合，且用角色权重假 score。

**用户核心目的**：自动化阵型模拟，以 owned 英雄为范围，确定 C 位后推荐最佳占位阵型推图。

**关键决策**：①第一刀做 Hero Ability 领域抽象层（算法-英雄分离）②质疑“评分”范式→三层架构（每种模式用真实目标量）③加成聚合层仔细处理各种加成④所有缺口必须列入 plan（不留“后续”）⑤UI 最后⑥去掉 isCarryViable 的 dps 角色判定⑦标号用中文层级⑧click damage 不纳入计算但作辅助参考值⑨MVP 忽略 BUD（用 DPS 近似）。

## 进度追踪（阶段级·中断后可续）

- [x] 1 抽象层（1.0-1.13）
- [x] 2 加成聚合+objective+baseDPS+spike（2.0-2.5）
- [x] 3 金币（3.0 dimension 过滤前置 + 3.1-3.6）
- [x] 4 crit（4.1-4.4）
- [x] 5 health/survival（降级为推图约束，5.1-5.3）
- [x] 6 vulnerability（6.1-6.4）
- [x] 7 speed（条件性，B0 后决定，7.1-7.3）
- [x] 8 buff_upgrade 展开（top N，8.1-8.4）
- [x] 9 scenario+schema（9.1 ✅ / 9.2-9.3 ✅）
- [ ] 10 推图预估（10.1-10.3）
- [ ] 11 全局加成（11.1-11.4）
- [ ] 12 restrictions 解析（12.1-12.3）
- [ ] 13 装备精细（13.1-13.4）
- [ ] 14 click 辅助 + modron + ult buff（14.1-14.4）
- [ ] 15 UI 接通（15.1-15.6·最后）
- [ ] 16 拖拽（16.1-16.5·最后）

> 步骤级 `[ ]`/`[x]` 见各里程碑文件；`goal-prompts.md` 按里程碑组织 `/goal` 提示词。

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

**核心变化**：placementFit 降级为 pool 聚合器（不产出“评分”）；每种模式用真实目标量（GameNumber）；“score/heuristicRoleMultiplier”淘汰；baseDamage 接入（champion-details 有）。

## BUD 对阵型模拟的价值

BUD = 阵型近期最高单次伤害。
- **阵型推荐（相对比较）**：帮助有限，**MVP 忽略 BUD 用 DPS**。
- **推图层数预估（绝对值）**：IC 怪物血量按 BUD 缩放；阶段 10 用 DPS 近似，标注“BUD 机制下可能偏差”。后续要精确再做 BUD 建模。

## 总体路线（UI 最后·全缺口阶段化）

```
1 抽象层 → 2 加成聚合+objective+baseDPS（含 2.0 多英雄 spike）
  → 数据补全系列：3 金币 → 4 crit → 5 health → 6 vulnerability → 7 speed → 8 buff_upgrade
  → 9 scenario+schema
  → 补强：10 推图预估 → 11 全局加成 → 12 restrictions → 13 装备精细 → 14 click+modron+ult buff
  → 15 UI 接通（最后）→ 16 拖拽（最后）
```

## 里程碑分组（大计划拆小计划·不限制 16 阶段死）

按依赖分 4 个里程碑，每个可独立验证、独立交付价值；里程碑之间可插入新阶段（如发现遗漏），不把 16 阶段限制死。

- **里程碑 1·核心引擎**（阶段 1 + 9.1 + 2）：**已完成**，产出真实 carryDps / BUD 计算能力（进度见上方追踪）。
- **里程碑 2·数据补全**（阶段 3-8 + 9.2/9.3）：`milestone-2-data-completeness.md`。产出所有 effect 类型进 pool。
- **里程碑 3·补强**（阶段 10-14）：`milestone-3-enhancement.md`。产出推荐准确 + 推图预估 + 辅助信息。
- **里程碑 4·UI**（阶段 15-16）：`milestone-4-ui.md`。产出用户可见可用。

## 文档同步硬约束（每个里程碑收口必须执行）

每个里程碑的改动必须**全链路同步到所有引用了受影响概念的架构文档与说明文档**，不允许只勾选进度追踪的 `[x]` 就收口。**日常 commit 修改 effect targeting / signal 语义 / 数据流方法时同理**——同步 grep `docs/research/data/game-data-source/format-quirks.md` / `docs/modules/planner/milestone-*.md` / `TODO.md` 更新描述，不得等里程碑收口（第五轮审计发现 f389586b/146c4723 修复 wrapper filter_targets 合并后，format-quirks / milestone-2 / TODO 三处长期残留「未处理/漏处理」描述）。M1 审计已发现：d22853d6 的 JSON/IndexedDB 改名、已删除的字段（`isCarryViable`/`heuristicRoleMultiplier` 等）在多个架构文档中长期残留旧名/旧概念，会直接误导后续 session 与智能体生成错误代码。

每个里程碑收口前必须完成：

1. **步骤级勾选**：在该里程碑每个已完成步骤标题补 `[x]`（不只是阶段级 `[ ]`/`[x]`，见上方进度追踪说明）。
2. **受影响符号清单**：列出本里程碑改动涉及的字段 / 类型 / 函数 / 文件名 / JSON 产物 / IndexedDB key / scoring 概念。
3. **全文档 grep 修正**：对清单中每个符号，在下列文档全量搜索，修正所有**当前态描述**与**未来步骤**中的陈旧引用：
   - `docs/modules/planner/`：README、evolution-plan、milestone-2..4、development-design、development-design-data、development-design-simulator、recommendation-and-placement-design、goal-prompts、prd、signal-coverage-research。
   - 根 `TODO.md`（`auto-todo` 技能维护）、根/目录 `README.md`、`AGENTS.md`/`CLAUDE.md`（如触及仓库级约束）。
4. **保留历史记录**：改名决策记录（“A→B 改名”）、dated research 快照、显式改名说明注记可保留旧名作为历史；其余当前态描述与未来步骤必须用最新名。
5. **测试覆盖**：本里程碑新增/改动的核心行为必须有测试覆盖（先写测试再实现），不得裸奔。
6. **收口验证**：`npm run typecheck`、`npm run test:run`、相关 build 脚本测试退出码 0；commit 信息用中文 Conventional Commits。

> AI-first 硬约束：架构文档是后续 session 与智能体理解系统的入口，旧名/旧字段/旧概念残留即视为本次改动未完成。

## 顺序评估（审查结论）

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
7. **“评分”淘汰**：用真实数值（`carryDps = baseDamage × levelCurve × pool 聚合`）。
8. **命名（实事求是·用户明确 A1·不留历史包袱）**：**去掉不适合的 Planner 前缀**。原则：**通用符号（英雄能力/数据）去 Planner，专属模块（推荐引擎）保留**。
   - **abilities 层全部去 Planner**：类型（`PlannerEffectSignal`→`HeroAbilitySignal` 等）、函数（`matchesPlannerHeroQualifier`→`matchesHeroQualifier`、`attachPlannerSignalSemantics`→`attachSignalSemantics`、`normalizePlannerEffectSignal`→`normalizeEffectSignal`、`resolvePlannerModel`→`resolveHeroAbilityProfiles`、`buildOfficialPlannerHeroModel`→`buildOfficialHeroAbilityProfile` 等；`getRolePriorityMultiplier` 随 heuristic 淘汰删除）、文件（`plannerSignalSemantics.js`→`signalSemantics.js`、`plannerQualifierParsing.js`→`qualifierParsing.js`、`planner-effect-helpers.mjs`→`effect-helpers.mjs`、`build-planner-models.mjs`→`build-models.mjs`、`planner-signal-coverage.mjs`→`signal-coverage.mjs`）。
   - **JSON 产物按通用性改名**：`planner-heroes.json`→`hero-abilities.json`、`planner-scenarios.json`→`scenarios.json`、`planner-semantic-overrides.json`→`semantic-overrides.json`；IndexedDB key（`plannerHeroOverrides`/`planner-heroes`/`planner-scenarios`）同步改名，旧 key 清理（用户本地数据因 schema 变化重建，可接受）。
   - **planner 推荐引擎模块保留**（`src/domain/planner/`：recommendationEngine/beamSearch/steadyStateScoring/candidatePool/placementFit 是“阵型推荐引擎”职责，`planner` 命名在此准确）；内部引用通用数据时用新名。
   - 执行时全面搜索 `Planner`/`planner` 残留，逐个评估：通用符号去前缀，专属模块保留。阶段 1 的 1.4-1.8/1.11 涵盖函数/文件/JSON 改名。

## 设计修正要点

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

## 全局约束

- **commit**：中文 Conventional Commits，每步一 commit。
- **验证基线**：每步 `npm run test:run && typecheck && build`；数据步骤加 `data:planner-coverage`；UI 加组件/E2E + 浏览器。
- **回归关卡**：每阶段 `npm run test:regression`。
- **TDD（硬约束·用户明确）**：**大阶段必须 TDD**（先写测试再实现，测试全程保持通过，不得为通过测试而削弱断言）；小步骤（1.x / 1.x.x）涉及逻辑的必须 TDD，纯 rename/move/delete 的机械步骤可豁免（但有 characterization 测试保护）。每个阶段完成的标志 = 测试绿 + 行为可验证。
- **codegraph**：`.codegraph/` 已就绪，1.13 后 reindex。
- **不变量**：算法-英雄握手点唯一；unsupported 只进 warning；每种模式真实目标量；UI 最后。

## 后置

- 修 `TODO.md` 2 个 pre-existing 测试（1.0 顺手）。
- 完成后总结“三层架构 + dimension 扩展位 + objective 真实目标量 + 全缺口阶段化”经验到仓库经验教训文档。

## 待确认（执行前可调整）

- **Q1 命名（已决定·A1）**：通用符号去 Planner（abilities 层 + JSON + 脚本 + IndexedDB），planner 推荐引擎模块保留。见架构决策 8。
- **Q2 levelCurve（已决定·A2 用户授权）**：MVP 简化（`costCurves` 派生），2.2 数据源确认。
- **Q3 baseGold（已决定·A3 用户授权）**：`idle_gold_rate_v2 × monster_gold_by_area`（3.4）。
- **Q4 拖拽（已决定·A4 用户授权）**：HTML5 原生 DnD，移动端 tap-target。

## 长期扩展（超出 16 阶段·待产品规划立项）

以下方向超出 16 阶段，属产品级长期愿景，待产品规划立项后再进入演进规划阶段化：

- **balanced scoring**：混合伤害/存活/速度/可获得性/解释复杂度的综合评分模式。
- **step simulation**：逐区/击杀/时间窗口/动态堆叠的逐步模拟（替代当前 steady-state 近似）。含 ult/主动技能 buff（`ability_defines`）的精确时间窗口建模——14.4 用 modron uptime 近似（duration/base_cooldown 折算），step simulation 替代为逐窗口的实际 ult 激活状态。
- **多队伍 / Trials / Time Gate**：多队伍编排与长期成长路线。
- **event / season / temporary buff 投影**：时效性 buff 的数据投影（modron/patron 已在阶段 11/14，此处指 event/season/temporary）。
- **manual parameter panel**：用户手动覆盖金币预算/装备/feat/传奇/专精的控件（阶段 15.3 候选模式 + 16 拖拽之外的扩展）。
