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
- `expected.calibrationTarget`：pool 级对照兜底
- `mock`：字段路径 → mock 说明

## 校准口径

- **逐项对照**（`multiplierChecks`）：`scoreBreakdown` 按 `rawEffect` 匹配出每条 signal 的 multiplier，偏差 < 30% 相对容差（游戏显示值如 `0.33%/层` 为取整近似，严格相等不现实）。
- **pool 对照**（`calibrationTarget`）：`hero_dps poolMultiplier` 对照游戏显示「叠层系数」，偏差 < 30%。
- **不对照绝对 DPS**：`baseDamage` 未校准，绝对 DPS 与游戏完全一致需 BUD 校准联动（`bud-verification` 范围）。对照止于加成系数倍率。
- **偏差 ≥ 30% fail**：测试 fail 并输出偏差报告（英雄/机制/公式/计算值/实测值/偏差%），不静默 warning。智能体须修正 scoring/归一化，或在 research 调研 md 标注合理根因后放宽断言。

## 测试三组（`references/championReferenceVerification.test.ts`）

1. **对照测试**：自动遍历所有 `*ReferenceData.ts`（零注册——新加文件即进测试流），按 `multiplierChecks` 逐项对照。
2. **孤儿机制预警**：扫 `hero-abilities.json` 全量 signal，按 `dps-mechanics.md` 规则归类，统计每机制实际使用英雄数。<2 输出 warning（不 fail）；≥2 必须走通用代码路径否则 fail。
3. **关联一致性**：reference 出现的 `mechanicId` 必须在注册表 + scoring 注释存在。

## 维护

新增/修正英雄参照走 `runbooks/add-champion-reference.md`（智能体维护工作流）。
