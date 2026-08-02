# 英雄实测参照：统一数据口径

用户游戏内观察到的英雄数据是计算器的 **oracle**——用真实英雄 / 阵型 / 等级跑计算器，对得上才算对，对不上就是计算器缺口（须修，或属未建模能力时在各专题文档登记边界）。一英雄一份 `<heroId>ReferenceData.ts`（`satisfies ChampionReference`），含一份或多份观测快照。无论「机制倍率参照」（蔚式）还是「伤害快照参照」（明斯克 / 瓦罗式），都进**同一 schema**，杜绝每批入库造新口径。

## 数据结构（`references/championReferenceTypes.ts`）

`ChampionReference`（hero 级）：`heroId / name / source:'game-observation' / researchDoc / rawDescription / snapshots[]`。

`ChampionReferenceSnapshot`（一份观测，字段按数据实际填，除 id/capturedAt/context 全可选）：

- `id` / `capturedAt`（ISO date，入库时间；同英雄多快照取最接近当前）
- `context`：`level? / area? / highestAvailableArea? / map? / patron? / formationSize / formationHeroIds / positions? / formationId? / note?`
- `attacks?`：`{ base?: ObservedAttack, ultimate?: ObservedAttack }`——游戏显示伤害原值（伤害快照用）
- `incomingBuffs?` / `providedBuffs?`：`ObservedBuff { nameZh, fromZh, source: 'blessing'|'patron'|'hero'|'self', effect, note? }`——source 分类决定单英雄隔离测试剔除交叉 buff（source:'hero'）
- `abilities?` / `modifiers?`：蔚式机制分析（`mechanicIds` / `mechanics` / `gameDisplay`）
- `expected?`：`{ manualStackCount?, multiplierChecks?, calibrationTarget? }`——机制倍率断言
- `abilityScores?` / `equipment?`：hero-static，记于最完整快照供核查
- `mock?`：数据缺口标注（字段路径 → 说明），用户补实测后移除

多英雄阵型：各英雄快照共享 `context.formationId` + 各自 `positions`，测试按 formationId 跨文件聚合。单英雄快照 `formationSize=1`。

## 校准口径（与 architecture.md「投影模式」一致）

- **formation-buff 模式（自动化，CI 门控）**：`objectiveValue` = 阵型内 signal 聚合（damagePool×crit×vuln）。断言交叉位置 buff 命中、计数、乘算堆叠、signal 齐全——确定性结构正确性，不依赖绝对校准。机制倍率逐项对照（`multiplierChecks`）偏差 < 30% 相对容差（游戏显示取整近似）。
- **absolute-dps 模式（记录不门控）**：`objectiveValue` = baseDamage×levelCurve×全因子。绝对量未校准（外部加成未建模 + 技能无等级门控 + cost 曲线 ≠ 伤害曲线），当前与实测差几十个数量级；`damageReferenceVerification.test.ts` 度量并打印 log10 偏差作 BUD 校准回归基线，驱动收敛，不阻塞 CI。绝对量对照待 architecture.md「未接入能力」补全后落地为断言。

## 测试两组（`references/*.test.ts`，`import.meta.glob` 真自动发现）

1. `championReferenceVerification.test.ts`：机制倍率端到端（蔚，built hero-abilities.json → evaluatePlacementFit → `multiplierChecks`）+ expected 自洽 + 抽象阈值 + mechanicId 三处一致。
2. `damageReferenceVerification.test.ts`：伤害快照端到端（明斯克/瓦罗 + 阵型），formation-buff 断言（位置 buff 命中、跨英雄加成生效）+ absolute-dps 偏差度量。

新增 `*ReferenceData.ts` 文件零注册进流（glob 自动）；每英雄配套 `docs/research/gameplay/champion-mechanics/<heroId>.md`（双向关联）。

## 维护

入库工作流见 `docs/runbooks/add-champion-reference.md`（冻结主入口）；机制注册表见 `dps-mechanics.md`；绝对值校准见 `docs/research/data/planner/bud-calibration.md`。
