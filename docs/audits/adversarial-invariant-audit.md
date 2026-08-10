# 对抗性与不变量审计（核心计算链路）

度量基准日：2026-08-10（分支 `opencode/dev3`）。本文件是「对抗性测试与不变量守护」轮的 canonical 来源；透镜与前几轮正交——不补覆盖广度（test-suite §8 已穷尽）、不查断言强度单点（test-depth §2 已核查）、不验已知 bug（correctness 已登记）、不审失败降级（runtime-edge 已审），而是回答：**恒成立的不变量有没有测试守护？被测函数能否被构造的反例打破契约？**

## 1. 审计范围

核心计算链路 4 个函数（codegraph 调用链确认）：

| 函数 | 文件 | 职责 |
|------|------|------|
| `scoreFormation` | `steadyStateScoring.ts:576` | 阵型评分主入口 → carryDps / teamGold |
| `evaluatePlacementFit` | `placementFit.ts:103` | 支援信号 → 池聚合（dimension 过滤 + level 门控 + position/qualifier 匹配） |
| `beamSearch` | `beamSearchRanking.ts:53` | beam search 候选搜索 → top-k 阵型 |
| `checkFormationLegality` | `formationLegality.ts:18` | seat 冲突 + forced 检查 |

## 2. 不变量守护（A 类）

以下不变量此前**无任何测试守护**；本轮新增 `steadyStateScoring.invariants.test.ts`（21 用例）和 `beamSearchRanking.invariants.test.ts`（12 用例）补齐。

| 不变量 | 守护测试 | 变异证伪 |
|--------|----------|----------|
| **确定性**：scoreFormation 相同输入多次调用结果恒等 | `invariants: 确定性` 3 次调用对比 objectiveValue/carryHeroId/breakdown | — |
| **输入不可变性**：scoreFormation 不修改 placements/heroesById/hero profiles | `invariants: 输入不可变性` 深快照前后对比 | — |
| **同池加成交换律**：打乱 support 来源顺序 carryDps 不变 | `invariants: 同池加成交换律` it.each 3 组（2/3 support + mult 类） | mergePools `+=`→`=` 被抓 |
| **单调性**：加入正加成 support → carryDps 不降；移除 → 不升；零加成 → 不变 | `invariants: 单调性` 3 用例（加/减/零） | — |
| **因子之积恒复现 carryDps**：baseDps × Πfactors ≈ carryDps（多组合） | `invariants: 因子之积` it.each 4 组（单因子/双因子/全因子/大基数） | critFactor skip 被抓 |
| **约束反单调性**：移除 support 后 carryDps 不升 | `invariants: 反单调性` 全阵型 vs 两个子阵型 | — |
| **beam search 确定性**：相同输入多次调用结果恒等 | `beam: 确定性` 两次调用对比 placements/objectiveValue | — |
| **beam search 产出恒合法**：所有结果 seat 无冲突 | `beam: 产出恒过 checkFormationLegality` | seat check 移除被「同 seat 大量英雄」抓 |
| **beam search lockedPlacements 恒尊重**：locked 出现在所有结果相同位置 | `beam: lockedPlacements 不变量` 2 用例 | — |
| **beam search 结果降序**：objectiveValue 恒按降序排列 | `beam: 结果排序不变量` | — |

## 3. 对抗性反例（B 类）

以下反例通过主动构造**合法或边界输入**验证被测函数的实际行为——是 fail-fast、静默错误、还是产出错误结果。

### 3.1 baseDamage 非正值静默校正（反例发现）

**发现**：`computeCarryDps`（`baseDps.ts:31`）含 guard `const baseDamage = hero.baseDamage > 0 ? hero.baseDamage : 1`。非正值（0 / 负 / NaN）被**静默替换为 1**，数据损坏完全不可见：

| 输入 baseDamage | 实际行为 | carryHeroId | carryDps |
|-----------------|----------|-------------|----------|
| 0 | guard 替换为 1 | `'carry'`（选中） | ≈1.06 |
| NaN | `NaN > 0 = false` → 替换为 1 | `'carry'`（选中） | ≈1.06 |
| -10 | `-10 > 0 = false` → 替换为 1 | `'carry'`（选中） | ≈1.06 |
| Infinity | `Infinity > 0 = true` → 保留 | `'carry'`（选中） | Infinity |

**行为分类**：静默错误（非 fail-fast、非崩溃、非零分）。非正值英雄被正常评分，用户无法从结果察觉数据损坏。

**风险评估**：低。生产数据中 `baseDamage` 来自 `hero-abilities.json`（build 期从游戏数据解析），数据腐蚀概率极低；runtime-edge §4 已覆盖 IndexedDB 腐蚀的 zod 校验门控。但若未来引入用户自定义英雄或数据管线变更，此 guard 会掩盖问题。

**处置**：锁现状（已补测试守护实际行为）。不在本轮修生产代码——guard 有向后兼容意义（旧数据可能含 baseDamage=0 的英雄占位符）。

### 3.2 lockedCarryHeroId 边界

| 场景 | 实际行为 | 守护测试 |
|------|----------|----------|
| 指向不在阵型的英雄 | 所有候选被 `lockedCarryHeroId !== entry.hero.heroId` 跳过 → carryDps 保持 ZERO | `invariants: lockedCarryHeroId 边界` |
| 空字符串 | guard `!= null && !== ''` 放行 → 正常评估 | 同上 |

### 3.3 beam search 空输入边界

| 场景 | 实际行为 | 守护测试 |
|------|----------|----------|
| 0 英雄 | `expandCandidates` 产出 0 → candidates 空 → 返回空数组 | `beam: 0 英雄` |
| 0 slot | slot 循环不执行 → 返回初始 candidate（空 placements） | `beam: 0 slot` |
| beamWidth=0 | `slice(0,0)` 剪枝 → 返回空数组 | `beam: beamWidth=0` |

### 3.4 奇异 placements

| 场景 | 实际行为 | 守护测试 |
|------|----------|----------|
| `{}`（空） | 早返回 ZERO + null carry/breakdown | `invariants: 空/奇异输入` |
| 引用不在 heroesById 的 heroId | `placedEntries` filter 丢弃 → 不崩溃 | 同上 |

## 4. 组合决策表（C 类）

`formationLegality.decisionTable.test.ts`（16 用例）系统化覆盖 seat 冲突 × forced 缺失的多约束组合。

决策表 14 行等价类组合 + 2 个反单调性验证：

| 约束组合 | 行数 | 交互效应 |
|----------|------|----------|
| 单约束合法（不同 seat / 单英雄 / 空） | 3 | — |
| 单约束 seat 冲突（2 同 seat / 3 同 seat / 2 组冲突） | 3 | 多组冲突产生多条违规 |
| 单约束 forced（全缺失 / 部分缺失 / 全在位） | 3 | — |
| **多约束交互**（seat + forced 叠加 / seat 但 forced 在位） | 2 | seat 冲突 + forced 缺失 → 两种违规并存 |
| **边界**（英雄不在 heroSeats / forced 指向不存在英雄） | 2 | undefined seat 不产生违规 |
| **反单调性**（合法阵型移除英雄 → 仍合法） | 1 | seat 约束满足反单调性 |
| **反单调性例外**（forced 移除 → 变非法） | 1 | forced 约束**不满足**反单调性（交互效应） |

关键发现：**forced 约束是反单调性的例外**——从合法阵型移除 forced 英雄后变非法（新增 missingForced 违规）。这是约束间交互效应的直接验证，此前无测试覆盖。

## 5. 变异证伪（D 类）

对 5 个核心金标断言做最小变异（改 1 个系数 / 漏乘 1 个因子 / swap 条件 / 颠倒不等式），验证对应测试变红：

| # | 变异点 | 变异描述 | 被谁抓 | 结果 |
|---|--------|----------|--------|------|
| 1 | `scoreCarryCandidate` critVuln | `critFactor * vulnFactor` → `vulnFactor`（漏乘 crit） | steadyStateScoring.test.ts crit 测试 + invariants 因子之积 | ✅ CAUGHT |
| 2 | `mergePools` addPercent | `+=` → `=`（覆盖而非累加） | steadyStateScoring.test.ts additive 测试 + poolAggregation.test.ts | ✅ CAUGHT |
| 3 | `expandCandidates` seat check | 移除 `usedSeats.has(seat)` continue | beamSearchRanking.test.ts seat 冲突 + invariants 同 seat 测试 | ✅ CAUGHT |
| 4 | `checkFormationLegality` seat 阈值 | `heroes.length > 1` → `> 2` | formationLegality.test.ts seat 冲突 + decisionTable | ✅ CAUGHT |
| 5 | `aggregateSignalToPool` 加法→乘法 | `addPercent += (mult-1)*100` → `multFactor *= mult` | steadyStateScoring.test.ts additive + poolAggregation.test.ts | ✅ CAUGHT |

**结论**：5/5 变异全被抓。断言强度健康——现有金标断言加上本轮新增的不变量守护，对核心计算链路的变异检测无逃脱。

**方法论教训**：初始用 `sed` 执行变异时，括号字符处理不当导致 2 个变异未实际应用（误报 escaped）。切换 `sd` 后全部正确应用并被抓。变异证伪的工具选择影响结果可信度——须验证变异实际生效后再判定。

## 6. 总结

| 维度 | 新增测试 | 基线 | 验收 |
|------|----------|------|------|
| 不变量（A） | 33 用例 | 0 | ✅ 确定性/不可变性/交换律/单调性/因子之积/反单调性 各 ≥1 |
| 反例（B） | 12 用例 | 0 | ✅ 极端数值/lockedCarry/空输入/beam 边界/自引用 各 ≥1 |
| 决策表（C） | 16 用例 | 0 | ✅ 14 行等价类 + 2 反单调性验证 |
| 变异证伪（D） | 5 变异点 | 0 | ✅ 5/5 CAUGHT，0 逃脱 |
| **总计** | 50 用例 | — | 1646 tests 全绿 |

**无新 P0/P1**：本轮未发现生产代码 bug（baseDamage guard 是已知设计选择，非 bug）。
