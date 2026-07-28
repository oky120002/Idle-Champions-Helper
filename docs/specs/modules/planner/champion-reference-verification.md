# 英雄 DPS 机制参照校准规范

英雄参照测试框架：用游戏表现层机制反推、校准模拟器评分。一英雄一份参照，自动进测试流，不手写注册。

## 数据结构（`references/championReferenceTypes.ts`）

`ChampionReference` 关键字段：

- `heroId` / `name` / `capturedAt` / `source: 'game-observation'`
- `researchDoc`：指向 `docs/research/gameplay/champion-mechanics/<heroId>.md` 完整调研（双向关联）
- `scenario.formationHeroIds`：对照测试构造阵型用；数据缺口用 `mock` 字段标注，用户补实测后移除
- `abilities[].mechanicIds`：关联键，必须三处一致（见 `dps-mechanic-abstraction.md`）
- `abilities[].mechanics`：机制参数（通用字段 `perStackPercent` / `amountFunc` / `stackFunc` / `stacksMultiply` / `formationCountQualifier` / `stackMaxExpr`，非英雄特化）
- `expected.manualStackCount`：对照游戏实测的层数（dynamic-stack-multiply 用）
- `expected.multiplierChecks[]`：逐项对照——`rawEffect` 匹配 `evaluatePlacementFit.scoreBreakdown`，`expectedMultiplier` 对照计算值
- `expected.calibrationTarget`：游戏观察的 pool 级参考值（人工核对用，当前不作为自动化断言，见校准口径）
- `mock`：字段路径 → mock 说明

## 校准口径

- **逐项对照**（`multiplierChecks`，**自动化**）：`scoreBreakdown` 按 `rawEffect` 匹配出每条 signal 的 multiplier，偏差 < 30% 相对容差（游戏显示值如 `0.33%/层` 为取整近似，严格相等不现实）。由 `championReferenceVerification.test.ts` 守护。
- **pool 对照**（`calibrationTarget`，**人工参考值，未自动化**）：记录用户游戏观察的 `hero_dps poolMultiplier`（如蔚「叠层系数」2.92e09%）与推导公式（`16384×576×1.2×2.578≈2.92e7`）。**当前不作为断言**——pool 级自动化对照受阻于：(a) 参照阵型 mock 不含专长/装备修饰信号；(b) `buff_upgrade` 修饰组合语义（代码按 `base.value` 折算进 addPercent vs 游戏可能独立乘）尚为近似（见 `vi-95.md`「推导与偏差」）。待修饰组合语义明确 + mock 补全后落地为断言。
- **不对照绝对 DPS**：`baseDamage` 未校准，绝对 DPS 与游戏完全一致需 BUD 校准联动（`bud-verification` 范围）。对照止于加成系数倍率。
- **偏差 ≥ 30% fail**（仅逐项对照）：测试 fail 并输出偏差报告（英雄/机制/公式/计算值/实测值/偏差%），不静默 warning。智能体须修正 scoring/归一化，或在 research 调研 md 标注合理根因后放宽断言。

## 测试三组（`references/championReferenceVerification.test.ts`）

1. **对照测试**：自动遍历所有 `*ReferenceData.ts`（零注册——新加文件即进测试流），按 `multiplierChecks` 逐项对照。
2. **抽象阈值规模守护**：`dps-mechanics.md` 注册表机制数 ≤ 10（>10 触发策略注册表升级，见 `dps-mechanic-abstraction.md`）。
3. **关联一致性（mechanicId 三处一致）**：reference 出现的 `mechanicId` 必须在注册表（reference leg）；注册表每个 id 必须在代码 `// 机制: <id>` 注释存在（代码注释 leg）。

> 孤儿机制预警（扫 `hero-abilities.json` 全量 signal 统计每机制实际使用英雄数）为 `dps-mechanic-abstraction.md` 阈值 2/3 的设计准则，尚未自动化；reference 当前仅蔚(95)一英雄，新增 reference 时人工确认机制通用性。

## 维护

新增/修正英雄参照走 `runbooks/add-champion-reference.md`（智能体维护工作流）。
