# 里程碑 1·核心引擎

- 作用：M1 执行步骤清单；产出真实 carryDps / BUD 计算能力。架构决策、16 阶段进度勾选、文档同步硬约束见 `evolution-plan.md` 总纲。
- 状态：阶段 1、2、9.1 已完成 [x]。

---

# 阶段 1：Hero Ability 领域抽象层（纯重构）

**目标**：英雄能力表达统一到 `src/domain/abilities/`，算法-英雄分离。纯重构，行为零变化（JSON 字节一致）。baseDamage 在此接入。

**边界**：不改评分逻辑/UI/JSON 产出/功能。只 rename/move/delete/加枚举位 + baseDamage 接入 + isCarryViable 修正。

**目标目录树**：`src/domain/abilities/`（abilityModel.ts/signalSemantics.js+.d.ts/qualifierParsing.js+.d.ts/README.md）；`src/domain/planner/scenarioModel.ts`；删除 `effectParser.ts`/`championSimulationProfile.ts`。

**已确认改动面**：1.4 caller 5 处；1.5 caller 1 处；1.6 类型名替换影响 placementFit(~12)/steadyStateScoring/recommendationTypes/recommendationEngine；candidatePool/hypotheticalBaseline 不改；1.7 含 plannerOverridesStore；1.10 死代码零生产 caller。

### 1.0 [x] 基线快照
- 记录 `shasum planner-{heroes,scenarios}.json` + fixture 推荐输出 + 测试通过数（332）。验证全绿。修 TODO.md。

### 1.1 [x] 建 abilities 目录 + README 骨架
- 新建 `src/domain/abilities/README.md`（定位/入口/不变量/边界/依赖方向/函数名取舍）。

### 1.2 [x] 提取 abilityModel.ts（类型 + resolver + baseDamage 字段）
- 新建 `src/domain/abilities/abilityModel.ts`：`HeroAbilityDimension`/`DIMENSION_BY_KIND`/`HeroAbilityKind`/`HeroAbilitySource`/`HeroQualifier`/`HeroPositionRelation`(27)/`HeroAbilitySignal`（字段零修改 + 加 `unit` 字段）/`HeroAbilityProfile`（**加 `baseDamage: number`** + 去 isCarryViable 的 dps 判定逻辑）/`applyHeroAbilityPatch`/`resolveHeroAbilityProfiles`。plannerModel 不动（双份共存）。
- **测试（先写）**：resolver 形态；patch 优先级；DIMENSION_BY_KIND 映射；HeroAbilityDimension 预留值；baseDamage 字段存在。

### 1.3 [x] 拆出 scenarioModel.ts
- 新建 `src/domain/planner/scenarioModel.ts`（`PlannerScenarioSlot`/`OfficialPlannerScenarioModel`/`findPlannerScenarioForVariant`）；plannerModel 加 `export *` 兼容。

### 1.4 [x] 搬 signalSemantics 到 abilities
- `git mv` + 改内部 import + 改 5 caller（planner-effect-helpers.mjs:13/placementFit.ts:8/build-planner-models.mjs:4/planner-signal-coverage.mjs:10/测试含 :252 动态 import）。
- 验证 JSON 与 1.0 baseline 字节一致。

### 1.5 [x] 搬 qualifierParsing + 补 .d.ts
- `git mv` + 新建 `qualifierParsing.d.ts`（对照 .js 校验签名）。

### 1.6 [x] planner 算法层迁移到 abilities 类型（逻辑零修改）
- placementFit.ts（~12 处类型名替换，最先）/steadyStateScoring/recommendationTypes/recommendationEngine。candidatePool/hypotheticalBaseline 不改。`matchesPlannerHeroQualifier` 不改名。

### 1.7 [x] 数据层迁移
- `src/data/plannerModel.ts` + `plannerOverridesStore.ts:1`（`PlannerHeroOverridePatch→HeroAbilityOverridePatch`）。函数名保留。

### 1.8 [x] build 脚本迁移 + baseDamage 提取- 复核 3 脚本 import 路径 + **从 champion-details 读 baseDamage 写入 planner-heroes.json**。

### 1.9 [x] build 验证 JSON 字节一致（baseDamage 除外）
- shasum 比对（baseDamage 是新增字段，JSON 会变，除 baseDamage 外字节一致）。

### 1.10 [x] 删除死代码
- `git rm` effectParser.ts/championSimulationProfile.ts + 3 测试。

### 1.11 [x] 清理 plannerModel shim + 收口 resolver
- `resolvePlannerModel` 拆成 `resolveHeroAbilityProfiles` + scenarios 直传。

### 1.12 [x] 补 README + 同步文档命名
- abilities/README 完整化；planner/README；批量 replace `docs/modules/planner/*.md` 类型名。

### 1.13 [x] 浏览器手验行为一致 + codegraph reindex
- `/planner` fixture 推荐与 1.0 baseline 一致；`codegraph init` 重新索引。

---

# 阶段 2：加成聚合 pool + objective + base DPS（核心）

**目标**：placementFit 从纯累乘改为 pool 结构；引入真实目标量 carryDps；淘汰 heuristicRoleMultiplier。**2.0 多英雄 spike 前置降低返工**。

### 2.0 [x] 多英雄 carryDps 公式验证 spike（前置·用户明确建议）
- 选 3-5 个英雄（C 位 + adjacent/global/tagged/stack 各类辅助，如 Bruenor + 一个 dps carry + 2-3 辅助）。
- 手工收集 baseDamage/level/equipment/carrySignals/supportSignals。
- 手工算 pool 聚合 + carryDps，对照 byteglow/kleho 社区数据。
- 记录公式/计算/偏差到 `docs/modules/planner/carry-dps-formula-spike.md`。
- **数据源确认（批判①）**：确认 byteglow 哪个页面给单英雄 DPS；选有明确数据的英雄。
- 偏差 <30% 可接受（社区数据含未建模因子）。偏差大先修正公式。

### 2.1 [x] objective 类型（简化·不强枚举 ObjectiveKind）
- 新建 `src/domain/planner/objectiveModel.ts`：`ObjectiveResult { value: GameNumberValue; breakdown: ObjectiveBreakdownPart[] }`。不强枚举 ObjectiveKind（Ponytail）。

### 2.2 [x] base DPS 计算（carryDps）
- 新建 `src/domain/simulator/baseDps.ts`：`computeCarryDps(hero, level, damageAggregate) = baseDamage × levelCurve(level) × aggregate`。
- levelCurve 从 `costCurves` 派生（MVP 简化，标注 ponytail）。
- 激活 `gameNumberArithmetic`（当前死代码）。
- **数据源确认（批判①）**：确认 levelCurve 用 costCurves 还是 game-rules。

### 2.3 [x] 加成聚合层重构为 pool 结构（最复杂）
- `HeroAbilitySignal.unit` 字段（1.2 已加）。
- placementFit 重构：按 kind 分 pool（global/hero）；pool 内 add→Σ/mult→Π；pool 间乘法；返回 `PoolAggregateResult`；加 `dimension` 入参；保留 bonusScaleOfSignal/stackFunc。
- **测试（先写）**：pool 内 add 相加/mult 相乘/pool 间乘法/新结果≠旧 fitScore/dimension 过滤/嵌套+stack。

### 2.4 [x] steadyStateScoring 改为 objective 驱动 + 去除 isCarryViable 限制
- 起步值 `heuristicRoleMultiplier` → `computeCarryDps`；score `number→GameNumberValue`；返回 `ObjectiveResult`；beamSearch 用 `compareGameNumbers`。
- **去除 isCarryViable 的 dps 判定**：枚举所有已放置英雄作为 carry 候选（不限 isCarryViable），让 carryDps 决定。
- 删 `build-planner-models.mjs:24/67/79/80` 的 `getRolePriorityMultiplier`/`heuristicRoleMultiplier`/`roles.has('dps')`。

### 2.5 [x] 统一解释语义 + Top K
- 删 `ROLE_PRIORITY`/`ROLE_LABELS`/`getRolePriorityScore`/`getChampionRoleSummary`。
- `buildPlannerExplanations` 用 carryDps 叙事（breakdown 留 M4 UI 接通时落地）。
- `results.find(top)` → `slice(0, PLANNER_TOP_K)`（`PLANNER_TOP_K` 内联于 `recommendationEngine.ts`，不为单常量建文件）。
- `PlannerRecommendationSet`（carryRanking/topLineups/slotAlternatives/seatCompetition）目标合同**留 M4 15.2** UI 消费时落地；M1 引擎只产出单一最高分合法阵型（`results` 已按 carryDps 降序，首个 score>0 即主推荐）。

---

# 阶段 9.1：mechanics→lockedSlots 投影（提前到 M1·已完成）

**目标**：scenario forced/banned/locked 从全空到部分填充。原属阶段 9，因 scenario 规则影响所有推荐而提前到阶段 1 之后、2 之前。

### 9.1 [x] mechanics→lockedSlots 投影
- **改动**：`build-planner-models.mjs:121-150 buildOfficialPlannerScenarioModel` 从 mechanics（`slot_escort`/`boss`/`hits_based`）派生 lockedSlots/scenarioWarnings；去掉 :143-148 硬编码 warning。
- **测试（先写）**：mechanics slot_escort → lockedSlots 标记；boss → scenarioWarnings。
- **验证**：`npm run test:run`；重跑 build 后部分变体 lockedSlots 非空。
- **commit**：`feat(data): 9.1 mechanics→lockedSlots 投影`。
- **执行时机**：阶段 1 之后、2 之前。

> 阶段 9 的其余步骤（9.2 eligibility→banned、9.3 zod schema）在 `milestone-2-data-completeness.md`。
