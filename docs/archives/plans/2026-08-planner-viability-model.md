# planner 阵型通关可行性模型

**创建**：2026-08-09
**类型**: milestone
**状态**: 已落地
**需求**：`docs/archives/requirements/2026-08-planner-formation-viability.md`

## 目标

将 planner 从「单目标最大化」升级为「多约束过滤 + 单目标排序」——不满足通关约束的阵型直接淘汰，在存活阵型中按 DPS 排序。

核心抽象：每个约束都是关于层数的单调函数，墙 = min(所有约束)。`ViabilityContext` 作为 scenario 参数上的新字段传入计算器，不改变 hermetic 边界。

## 范围

涉及模块：`src/domain/simulator/`、`src/domain/planner/`、`scripts/data/`、`src/pages/planner/`

完整 10 维约束图谱见 `docs/research/gameplay/viability-constraint-taxonomy.md`。按 ROI 分 5 阶段实施。

## 阶段 Checklist

### 阶段 A：生存约束过滤 + 伤害削减修正

无新数据需求——survival 数据已在 `ScoringResult.areaEstimate`。

- [x] A1 `PlannerRecommendationOptions` + `minSurvivableArea` 字段
- [x] A2 `scorePlannerFormationWithLegality`：beam search 评估回调检查 survival 约束 → SCORE_ZERO
- [x] A7 测试：survival-filter + survival-no-threshold（2 用例 ✅）
- [x] A3 `recommendationTypes.ts`：`PlannerResult.viability` 字段（ViabilityAssessment：activeConstraints + boundBy）
- [x] A4-A5 伤害削减（K5）：已在 B5-B9 落地（damageModifier × BUD）
- [x] A6 UI：生存评估展示 + `minSurvivableArea` 控件

### 阶段 B：多段攻击 BUD 修正 + 护甲感知

- [x] B1 `buildHeroModels` / `abilityModel.ts`：profile + `numTargets` / `damageModifier`（15 多段英雄数据到位）
- [x] B2 `budCalculation.ts`：`computeSingleHitDamage` 签名扩展 + 公式修正（per-target BUD = dps×cd/numTargets，4 测试 ✅）
- [x] B3 `restrictions-parser.ts`：护甲段数 / 命中型 / 段数递增 / 伤害修正 / 敌人倍率解析（6 测试 ✅）
- [x] B4 `plannerModel.ts` / `buildScenarioModels.ts`：ViabilityContext 类型 + scenario 投影 + 全量 fixture 更新（1523 测试 ✅）
- [x] B5+B6 `areaEstimation.ts`：护甲吞吐量约束（合并 B5 新文件→直接内联，Ponytail）。
  公式修正：原 `threshold = HP/segments` 是数学空操作（HP/N < HP 永远弱于基础 BUD 约束）；
  改为吞吐量模型 `threshold = HP × segments`（需 segments+1 次命中）。damageModifier × BUD，enemyDamageMult × monsterDpsAt（8 测试 ✅）
- [x] B7 `steadyStateScoring.ts` + `recommendationEngine.ts`：viabilityContext 传入 estimateMaxArea + 护甲 killableArea 约束过滤（与生存过滤同构）（2 测试 ✅）
- [x] B8 signal-coverage baseline 更新：无漂移（exit 0），数据管线未改动无需更新
- [x] B9 测试：✅ B5-B7 测试已落地（areaEstimation 6 用例 + recommendationEngine 2 用例）

### 阶段 C：存活约束精化（S1~S3）

- [x] C1 解析敌人伤害倍率（S1）→ 已在 B5-B9 落地（enemyDamageMult × monsterDpsAt）
- [x] C2 解析持续掉血（S2）→ healthDrainRate 进 ViabilityContext → estimateMaxArea 降低有效生命（8 变体命中）
- [x] C3 解析不回血（S3）→ 标记为 scenarioWarnings（`only_heal_on_revive`/`skip_area_change_heal` tag）；治疗吞吐量模型留后续
- [x] C4 精化 survival 检查：healthDrainRate × (1 - rate) EHP 修正 + enemyDamageMult 已在 estimateMaxArea 内消费
- [x] C5 测试：healthDrainRate 解析 3 用例 + areaEstimation survival 1 用例

### 阶段 D：高级击杀约束（K3/K4）

- [x] D1 暴击门控（K3）：`debuff_until_crit` tag → scenarioWarnings（所有英雄有基础暴击率，不改变面积预估）
- [x] D2 伤害来源限制（K4）：两层方案（系统解析 25 变体 + UI 手动标记）已落地
- [x] D3 命中型频率（K2）：hitsBased 进 estimateMaxArea 吞吐量约束（与护甲同模式，2 变体）

### 阶段 E：策略约束 + AoE 爆发（P0/S4）

- [x] E1 永久死亡标记（P0）：scenarioWarnings（`perma_death`/`perma_unavailable` tag）
- [x] E2 AoE 爆发生存（S4）：burst 伤害等效 healthDrainRate（parseBurstDrainRate: X%/N秒 → X/100/N，23 变体覆盖）；防御机制评估留后续
- [x] E3 测试：burst 解析 3 用例 + areaEstimation 6 用例 + recommendationEngine 4 用例

## 验收

- ✅ 护甲变体推荐结果反映碎甲能力（不碎甲的阵型被淘汰）
- ✅ AoE 变体推荐结果反映生存能力（burst 伤害等效持续掉血降低 survivableArea）
- ✅ 普通变体行为不变（不激活额外约束）
- ✅ `PlannerResult.viability` 非空且反映实际评估（activeConstraints + boundBy）
- ✅ 所有现有测试不退化（1541 pass + build clean）

## 验证

1. ✅ `npx vitest run` — 1562 pass（+21 新增用例：parser 16 + scoring 5）
2. ✅ `npm run signal-coverage` — 无漂移（exit 0）
3. ✅ `npm run build` — Pages 兼容（tsc -b + vite build clean）

## 落地后 specs 更新点

- ✅ `simulator.md` 增加推图层数预估 + 可行性约束章节（ViabilityContext 5 字段 + 机制警告）
- ✅ `computation-runtime.md` 更新推图预估公式（segmentMultiplier / drainRate / enemyDamageMult）+ ViabilityAssessment 输出合同
- `architecture.md`「未接入能力」：viability + K4 伤害来源限制 + S4 AoE burst 均已接入（无需更新未接入清单）

## 剩余工作评估（2026-08-09 调研）

### E2（S4 AoE burst）— ✅ 已完成

burst 伤害等效 healthDrainRate（`parseBurstDrainRate`：X%/N秒 → X/100/N）。8→23 变体覆盖（+15 burst）。防御机制评估留后续。

### A6（UI）— ✅ 已完成

- `boundBy = 'armor'` → 护甲受限标签
- `viability.activeConstraints` 展示（护甲/命中型/伤害削减/敌人强化/持续掉血）
- `PlannerSurvivableArea` 控件（null=不设=仅报告，输入数字=启用过滤）

### D2（K4 伤害来源限制）— ✅ 已完成

两层方案落地：系统解析 25 变体（same-column 2 / adjacent 10 / not-adjacent 7 / front-columns 4 / behind-columns 2）+ UI 手动标记。详见 commit `1bb34e40`。

**数据现状**（`variants.json` 1424 变体全集扫描）：

| 模式 | 变体数 | 示例 |
|------|--------|------|
| 列限制（"only Champions in X's column"） | 25 | v708 Ezmerelda 列 |
| 前后列（"two columns in front/behind"） | 25 | v1663 Volo 前两列 |
| 标签/羁绊（"only Champions with bond/tag"） | 20 | v132 Asharra 羁绊 |
| 相邻（"only Champions adjacent to X"） | 10 | v401 Mirt 相邻 |
| 层数门控（"after area N, only..."） | 12 | v2010 area 150 后 |
| 英雄专属/复杂语义 | 71 | v752 Shaka 天体谜题 |
| `slot_effects` mechanics tag（总标记） | 94 | 含前置完成条件等非伤害约束 |

**核心判断**：K4 是**位置约束**——carry 在无效位置时 DPS 归零，但加成能力不受影响（"formation abilities are active"）。不是面积函数，无法用 estimateMaxArea 模型覆盖。

**两层方案**（系统解析 + UI 补刀）：

**层 1 — 系统解析（变体必填，用户不可关闭）**：
- 从 restrictions 文本解析高频位置模式（column / adjacent / front-back）→ 结构化约束
- 验证在 `scorePlannerFormationWithLegality`：carry 不在可造伤害位置 → SCORE_ZERO
- 只检查 carry 位置，不过滤支援英雄（支援位加成不受影响）

**层 2 — UI 手动标记（用户补充，默认全部可造伤害）**：
- UI 展示阵型棋盘，用户可标记哪些槽位「不能造伤害」
- 默认全部可造伤害——用户只做减法
- `PlannerRecommendationOptions.userDamageDisabledSlots: string[]`
- 与层 1 叠加：`disabledSlots = systemParsed ∪ userMarked`

**UI 提示**（精简大白话）：
> 有些变体限制了哪些位置能打伤害。默认都能打，如果变体有特殊限制，你可以手动标记不能打伤害的格子。核心英雄不能放在不能打伤害的格子上。

**数据模型**：

```typescript
// plannerModel.ts — scenario 级（系统解析，必填）
interface DamageSourceRestriction {
  /** 不能造伤害的槽位 ID（黑名单）。空 = 全部可造伤害（无限制）。 */
  damageDisabledSlots: string[]
}

// recommendationEngine.ts — 用户级（UI 设置，可选）
PlannerRecommendationOptions.userDamageDisabledSlots?: string[]
```

**验证逻辑**（`scorePlannerFormationWithLegality`）：
```typescript
const disabledSlots = new Set([
  ...scenario.damageDisabledSlots,
  ...(options.userDamageDisabledSlots ?? []),
])
if (disabledSlots.size > 0 && scoring.carryHeroId != null) {
  const carrySlotId = Object.entries(placements).find(([, id]) => id === scoring.carryHeroId)?.[0]
  if (carrySlotId && disabledSlots.has(carrySlotId)) return SCORE_ZERO
}
```

**解析优先级**（build 时 restrictions-parser）：
1. `column` 模式：识别参考英雄（forced hero）+ 同列槽位 → 其他列为 damageDisabledSlots
2. `adjacent` 模式：参考英雄的 adjacentSlotIds 之外的槽位 → damageDisabledSlots
3. `front/back` 模式：参考英雄前/后列之外的槽位 → damageDisabledSlots
4. 无法解析的模式 → 不设结构化约束，依赖 UI 层 + scenarioWarnings

**不在本阶段范围**：标签/羁绊型（20 变体）、英雄专属能力（71 变体）——这些不是纯位置约束，依赖运行时能力状态，留 UI 层处理。
