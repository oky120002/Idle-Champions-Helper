# planner 可行性模型——三项 warning 升级为过滤/建模

**优先级**：劣后——仅在没有其他可做需求时才启动

## 是什么

将可行性模型中 K3 暴击门控、S3 不回血和 P0 永久死亡三类 warning 升级为可过滤或可计算的约束。

## 背景

viability 模型 A-E + D2 全部落地后（commit `1bb34e40`），10 维约束图谱中三项仍以 scenarioWarnings 形式存在——仅向用户提示机制存在，不参与过滤或面积预估。这三项之所以只做 warning，是因为升级为过滤/建模需要引入新的运行时模型（暴击频率、治疗吞吐量、阵亡传导），复杂度显著高于已落地的约束，且影响面有限（变体数少、用户可按提示自行调整）。

本文档记录每一项「具体要做什么」「为什么当前是 warning」「升级需要什么」，作为劣后需求入库。

## K3 暴击门控（`debuff_until_crit`，11 变体）

### 当前状态：warning

```
当前场景敌人需暴击才能造成有效伤害，暴击率与暴击伤害价值提升。
```

### 为什么是 warning

所有英雄都有基础暴击率（>0%），所以「需要暴击才能伤害」不会使 DPS 归零——只是降低了有效命中频率。在面积预估模型中，这等价于一个 BUD 缩放因子（有效 BUD = BUD × critChance），但当前 critChance 作为 DPS 倍数已经烤进了评分（`critFactor`），所以面积预估已经隐含了暴击的影响。

未建模的部分是**暴击频率门控**：部分变体的语义是「敌人需被暴击命中 N 次后才取消减伤 buff」，这是一个独立的吞吐量约束（与护甲碎段同构），而非单纯的 DPS 缩放。

### 升级要做什么

1. 从 restrictions 文本解析暴击门控段数（「需暴击 N 次」→ `critGatedSegments: N`），进 ViabilityContext
2. 在 `estimateMaxArea` 增加暴击吞吐量约束：等效门槛 = `monsterHealthAt(area) × critGatedSegments`，与护甲吞吐量模型同构
3. 需要暴击率数据——当前 `critFactor` 已有，但需确认是否覆盖所有英雄的基础暴击率

### 变体数

11 个（`debuff_until_crit` tag）

## S3 不回血（`only_heal_on_revive` / `skip_area_change_heal`，18 变体）

### 当前状态：warning

```
当前场景换区不恢复生命，需要治疗能力或高有效生命。
```

### 为什么是 warning

正常情况下英雄换区时回满血。不回血变体中，carry 的有效生命需要覆盖跨区累计伤害——这要求一个**治疗吞吐量模型**：治疗信号的 HPS（每秒治疗量）能否覆盖怪物 DPS 的累计伤害。

当前 planner 的治疗信号（`heal` kind）只登记不评分，没有解析为 HPS。建模治疗吞吐量需要：
- 从 ability 数据提取治疗系数和触发频率
- 建立 HPS vs monster DPS 的面积函数
- 区分主动治疗（维康妮亚等）和触发型治疗（巴尔德里克等）

这是一个独立的能力基建，复杂度远高于其他约束（均为现有 BUD/EHP 模型的参数扩展）。

### 升级要做什么

1. 从 hero-abilities.json 解析治疗信号的治疗量和触发频率 → HPS 模型
2. 在 `estimateMaxArea` 增加治疗约束：`effectiveHealth + healPerArea × areaSpan ≥ monsterDpsAt(area) × areaSpan`
3. 不回血标记进 ViabilityContext（`noAreaChangeHeal: boolean`）控制是否启用治疗约束
4. 治疗信号覆盖度审计（当前 `heal` kind 仅 3 个信号，需确认完整性）

### 变体数

18 个（`only_heal_on_revive` + `skip_area_change_heal` tag）

## P0 永久死亡（`perma_death` / `perma_unavailable`，36 变体）

### 当前状态：warning

```
当前场景英雄阵亡后永久离队（永久死亡），生存能力至关重要。
```

### 为什么是 warning

永久死亡本身不改变面积预估的数学模型——它是一个**阵型稳定性约束**：一旦有英雄阵亡，后续区域可用英雄减少，阵型可能崩塌。但 planner 的面积预估是稳态模型（假设阵型不变），不模拟英雄阵亡的动态过程。

建模这个需要一个**阵亡传导模型**：评估每个英雄的生存概率，如果支援英雄可能阵亡（EHP 不足），则阵型在后续区域失去加成，carry DPS 下降。这是一个多步模拟，超出当前单目标稳态评估的架构边界。

当前 survival 过滤（`minSurvivableArea`）已经间接覆盖了核心场景——如果 carry 活不下来，阵型已被淘汰。永久死亡对 carry 的影响与 survival 约束一致；对支援英雄的影响（阵亡后失去加成）是未建模的部分。

### 升级要做什么

1. 对每个支援英雄也计算 survivableArea（当前只算 carry）
2. 如果支援英雄的 survivableArea < minSurvivableArea，标记阵型为「阵型稳定性不足」
3. 可选：进阶模型——支援英雄阵亡后用剩余英雄重新评估 DPS（多步模拟），复杂度高
4. 永久死亡标记进 ViabilityContext（`permaDeath: boolean`）控制是否对支援英雄也施加 survival 约束

### 变体数

36 个（`perma_death` + `perma_unavailable` tag）

## 为何暂缓

1. **影响面有限**：三项合计 65 变体（占 1424 总量的 4.6%），且 warning 已提示用户自行关注
2. **基建依赖**：S3 需要治疗 HPS 模型（全新基建），P0 需要支援英雄 survival（现有模型扩展但仍需验证），K3 需要确认暴击频率数据完整性
3. **ROI 低**：已落地的约束（护甲/持续掉血/AoE burst/伤害来源限制）覆盖了更高频、更影响推荐结果的场景

## 关联

- **约束图谱**：`docs/research/gameplay/viability-constraint-taxonomy.md`（K3/S3/P0 行）
- **执行计划**：`docs/archives/plans/2026-08-planner-viability-model.md`（已完成的 A-E + D2）
- **当前 warning 实现**：`scripts/data/buildScenarioModels.ts:75-93`（`projectMechanicsToScenario`）
- **面积预估模型**：`src/domain/simulator/areaEstimation.ts`（`estimateMaxArea`）
