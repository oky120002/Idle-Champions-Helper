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
- [ ] A3 `recommendationTypes.ts`：`PlannerResult` + `viability` 字段（并入阶段 B ViabilityAssessment）
- [ ] A4-A5 伤害削减（K5）：并入阶段 B ViabilityContext 统一承载变体修正参数
- [ ] A6 UI：生存评估展示 + `minSurvivableArea` 控件

### 阶段 B：多段攻击 BUD 修正 + 护甲感知

- [x] B1 `buildHeroModels` / `abilityModel.ts`：profile + `numTargets` / `damageModifier`（15 多段英雄数据到位）
- [x] B2 `budCalculation.ts`：`computeSingleHitDamage` 签名扩展 + 公式修正（per-target BUD = dps×cd/numTargets，4 测试 ✅）
- [ ] B3 `restrictions-parser.ts`：护甲段数 / 命中型 / 段数递增解析（K1/K2）
- [ ] B4 `plannerModel.ts` / `buildScenarioModels.ts`：scenario + `viabilityContext`
- [ ] B5 `armorEstimation.ts`（新）：护甲感知击杀预估（段门槛面积函数）
- [ ] B6 `areaEstimation.ts`：整合护甲感知 `killableArea`
- [ ] B7 `steadyStateScoring.ts`：护甲约束检查 + `viabilityFlags.armorPass`
- [ ] B8 signal-coverage baseline 更新
- [ ] B9 测试：BUD 多段修正、护甲解析、护甲面积函数

### 阶段 C：存活约束精化（S1~S3）

- [ ] C1 解析敌人伤害倍率（S1）→ 修正 `monsterDpsAt`
- [ ] C2 解析持续掉血（S2）→ 叠加到 incoming damage
- [ ] C3 解析不回血（S3）→ 标记 + 评估治疗信号能否维持
- [ ] C4 精化 survival 检查为复合模型
- [ ] C5 测试

### 阶段 D：高级击杀约束（K3/K4）

- [ ] D1 暴击门控（K3）：crit chance > 0% 检查
- [ ] D2 伤害来源限制（K4）：解析 + carry 位置验证
- [ ] D3 命中型频率（K2）：攻击频率 vs 段数
- [ ] D4 测试

### 阶段 E：策略约束 + AoE 爆发（P0/S4）

- [ ] E1 永久死亡标记（P0）：warning 级提示
- [ ] E2 AoE 爆发生存（S4）：免疫/减伤/临时HP 评估
- [ ] E3 测试

## 验收

- 护甲变体推荐结果反映碎甲能力（不碎甲的阵型被淘汰）
- AoE 变体推荐结果反映生存能力（扛不住的阵型被淘汰）
- 普通变体行为不变（不激活额外约束）
- `PlannerResult.viability` 非空且反映实际评估
- 所有现有测试不退化

## 验证

1. `npx vitest run` — 各阶段新增用例
2. `npm run signal-coverage` — 多段攻击字段进 profile 后更新 baseline
3. `npm run simulate -- recommend --variant <armored-variant-id>` — CLI JSON 检查 viability
4. `npm run build` — Pages 兼容

## 落地后 specs 更新点

- `architecture.md`「未接入能力」移除 viability 项
- `simulator.md` 增加 viabilityContext 入参 + 护甲感知 areaEstimation
- `computation-runtime.md` 更新推图预估输出合同
