# planner 阵型通关可行性模型

**创建**：2026-08-09
**Type**: milestone
**Status**: Accepted
**需求**：`docs/requirements/2026-08-planner-formation-viability.md`

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
- [ ] A6 UI：生存评估展示 + `minSurvivableArea` 控件

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
- [ ] B9 测试：✅ B5-B7 测试已落地（areaEstimation 6 用例 + recommendationEngine 2 用例）

### 阶段 C：存活约束精化（S1~S3）

- [x] C1 解析敌人伤害倍率（S1）→ 已在 B5-B9 落地（enemyDamageMult × monsterDpsAt）
- [x] C2 解析持续掉血（S2）→ healthDrainRate 进 ViabilityContext → estimateMaxArea 降低有效生命（8 变体命中）
- [x] C3 解析不回血（S3）→ 标记为 scenarioWarnings（`only_heal_on_revive`/`skip_area_change_heal` tag）；治疗吞吐量模型留后续
- [x] C4 精化 survival 检查：healthDrainRate × (1 - rate) EHP 修正 + enemyDamageMult 已在 estimateMaxArea 内消费
- [x] C5 测试：healthDrainRate 解析 3 用例 + areaEstimation survival 1 用例

### 阶段 D：高级击杀约束（K3/K4）

- [x] D1 暴击门控（K3）：`debuff_until_crit` tag → scenarioWarnings（所有英雄有基础暴击率，不改变面积预估）
- [ ] D2 伤害来源限制（K4）：解析 + carry 位置验证
- [x] D3 命中型频率（K2）：hitsBased 进 estimateMaxArea 吞吐量约束（与护甲同模式，2 变体）

### 阶段 E：策略约束 + AoE 爆发（P0/S4）

- [x] E1 永久死亡标记（P0）：scenarioWarnings（`perma_death`/`perma_unavailable` tag）
- [ ] E2 AoE 爆发生存（S4）：免疫/减伤/临时HP 评估
- [ ] E3 测试

## 验收

- ✅ 护甲变体推荐结果反映碎甲能力（不碎甲的阵型被淘汰）
- ⬜ AoE 变体推荐结果反映生存能力（扛不住的阵型被淘汰）— 待 E2（S4 AoE burst）
- ✅ 普通变体行为不变（不激活额外约束）
- ✅ `PlannerResult.viability` 非空且反映实际评估
- ✅ 所有现有测试不退化（1538 pass + build clean）

## 验证

1. ✅ `npx vitest run` — 1538 pass（+17 新增用例）
2. ✅ `npm run signal-coverage` — 无漂移（exit 0）
3. ✅ `npm run build` — Pages 兼容（tsc -b + vite build clean）

## 落地后 specs 更新点

- ✅ `simulator.md` 增加推图层数预估 + 可行性约束章节（ViabilityContext 5 字段 + 机制警告）
- ✅ `computation-runtime.md` 更新推图预估公式（segmentMultiplier / drainRate / enemyDamageMult）+ ViabilityAssessment 输出合同
- `architecture.md`「未接入能力」：viability 未列入（无需移除），K4 伤害来源限制 + S4 AoE burst 仍为未接入

## 剩余工作评估（2026-08-09 调研）

### D2（K4 伤害来源限制）— ⚠️ 不建议全自动化

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

**核心难点**：K4 是**位置约束**，不是面积函数。carry 必须在有效位置才能造成伤害（DPS 归零否则）。与 K1/K5/S1/S2（修改面积预估）本质不同。

两个子问题：
1. **解析**（build 时）：从自由文本提取结构化约束。模式极多样——英雄特定能力（Asharra 羁绊、Shaka 谜题）、动态空间关系（"Qillek 两格内"）、逆序（"相邻英雄**不**造伤害"）——无法用统一正则覆盖。
2. **验证**（运行时）：检查 carry 放置是否满足约束。**如果**有结构化约束，这步是简单的——planner 已有 slotTopology（row/column/adjacentSlotIds）+ forcedHeroes + carryHeroId。

**建议方案**（分三档）：

| 档位 | 范围 | 方法 | 工作量 |
|------|------|------|--------|
| 当前（已做） | 全部 | `slot_effects` → scenarioWarnings（已有计时/点击限制 warning） | — |
| **可做** | ~50 位置型 | 解析高频模式（column / adjacent / front-back）→ `carryPositionConstraint` 字段 → beam search 合法性检查 | 中（~1 天） |
| 不建议 | 全部 137 | NLP 级语义解析（英雄专属能力、动态关系、逆序） | 高，ROI 低 |

**「可做」档架构设计**：

```typescript
// plannerModel.ts 新增
interface CarryPositionConstraint {
  /** carry 必须在指定英雄的同一列 / 相邻 / 前方 / 后方才能造伤害。null = 无位置约束。 */
  relativeTo?: { heroId: string; relation: 'column' | 'adjacent' | 'front' | 'back' }
  /** carry 必须（不）相邻于指定英雄才造伤害。 */
  blockedByAdjacent?: string[]  // heroId list — 相邻则 DPS=0
}
```

验证在 `scorePlannerFormationWithLegality`：carry 不满足位置约束 → SCORE_ZERO（与生存/护甲过滤同构）。槽位拓扑（row/column/adjacentSlotIds）已可用。

### E2（S4 AoE 爆发）— ✅ 可复用 healthDrainRate 模型

**数据现状**（`random_crusader_damage` 39 变体 + 其他 burst 模式）：

| 模式 | 变体 | 伤害 | 频率 |
|------|------|------|------|
| 随机目标 burst | 39 | 1%-100% maxHealth（中位 25%） | every 5-10s |
| 全队 burst | ~10 | 10%-90% maxHealth | every 3-10s |

**关键洞察**：burst 伤害等效为持续掉血——`等效 drainRate = burstPct / burstInterval`。
- 25% every 5s → drainRate = 0.05/s（5%/s）
- 90% every 5s → drainRate = 0.18/s

这**直接复用已有 healthDrainRate 模型**（EHP × (1−drainRate)）。不需新建面积函数，只需解析 burst 模式并换算。

**随机目标修正**：burst 打随机英雄时，carry 被击中概率 = 1/formationSize。保守近似：忽略概率（当全队 burst 处理）。精确化需 formationSize 参数进 estimateMaxArea，留后续。

**防御机制**（免疫/减伤/临时HP/治疗）：`aoe-survival.md` 已盘点四类防御，`hero-abilities.json` 有 `damageReduction`（9 例）+ `heroHealthMultiplier`（3 例）信号。但这些信号进 survival 池的方式需单独设计（当前 survival 池只有 health_mult，不含 damage_reduction）。留后续迭代。

**建议方案**：解析 `random_crusader_damage` 变体的 burstPct + burstInterval → 换算等效 healthDrainRate。~39 变体覆盖，复用现有模型，工作量低（~2h）。

### A6（UI）— ✅ 可直接做

**现状**：
- `PlannerResultCard.tsx` 已展示 `areaEstimate`（面积 + 约束标签 + 击杀/存活上限）
- `boundBy = 'armor'` 标签已补（`9717095`）
- `viability.activeConstraints` 有数据但未展示
- `minSurvivableArea` 有引擎逻辑但无 UI 控件

**待做**（按优先级）：

| 项 | 工作量 | 说明 |
|----|--------|------|
| activeConstraints 展示 | 低 | 结果卡中展示活跃约束标签（护甲/持续掉血/敌人强化等） |
| minSurvivableArea 控件 | 低 | options 面板加数字输入或滑块（默认不设=不过滤） |
| scenarioWarnings 突出 | 低 | 已有 warnings 区，特殊机制（永久死亡/不回血/暴击门控）可加图标 |

纯 UI 工作，无新架构。

## 剩余工作优先级排序

1. **E2（S4 burst → healthDrainRate）**：最低工作量、复用现有模型、~39 变体覆盖 → **先做**
2. **A6（UI）**：低工作量、用户可见价值 → **可并行**
3. **D2（K4 位置约束）**：中工作量、~50 变体覆盖 → **视 ROI 决定**
