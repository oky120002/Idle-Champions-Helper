# planner 能力扩展

**优先级**：待评

## 是什么

在稳态、可解释推荐保持可靠的前提下，扩展当前无法精确求值或不在结果合同中的 planner 能力。下为各子项当前落地状态（2026-08-06 核验）。

### Checklist

- [ ] **数值表达式求值器**（部分）—— 统一解析 stack 数量、复合 amount expression 与阵型聚合查询
  - [x] 存档依赖谓词：`GetUpgradeUnlocked` / `GetUpgradePurchased` / `GetFeatEquipped` / `is_alive` / `EligibleForPatron` 5 族已实现（`docs/specs/modules/planner/expression-evaluator.md`）
  - [ ] `HasEffect` / `ByID` 阵型运行时谓词（effect 跨英雄共享，count qualifier 对全阵型求值致交叉，需 effect 作用图 + 迭代求值，另案）
- [ ] **综合目标**——评估伤害、存活、速度、可获得性与解释复杂度的组合评估
  - 当前单目标：`carry-dps`（damage / crit / vulnerability 三维复合）、`team-gold`；未组合存活 / 速度
- [ ] **逐步模拟**——覆盖逐区、击杀、时间窗口、动态叠层和主动技能精确窗口
  - simulator 数字层基建已有（`src/domain/simulator/`：`areaEstimation` / `baseDps` / `budCalculation` / `goldBudgetBaseline` / `modronInfo` / `survivalCalculation` / `ultUptime`），未接入评估链路
- [ ] **输出扩展**——独立的逐槽位替补与同席位竞争字段
  - 未做
- [ ] **场景扩展**——多队伍、Trials、Time Gate、活动与赛季临时加成投影
  - 未做（英雄详情页有 Trials / Time Gate 展示，planner 未消费）
- [ ] **手动参数**（部分）—— 金币预算、装备、专长、传奇与专精覆盖控件
  - [x] 装备假设配置（`synthesizeHypotheticalLootByHero`，无存档时按 UI 可调统一稀有度 + 附魔等级，默认毕业 4+2000）
  - [x] 专精注入（专精信号池 + 级联依赖链修复 + 等级门控）
  - [x] 专长（feat）buff wrapper（反查 `buff_upgrade` 通道）
  - [x] 动态层数假设（`manualStackCount`，默认 1000，UI 透传）
  - [x] 金币预算（金币/等级互斥控件 → worker 换算 → `heroLevelOverride` + `goldBudget` + 专精门控，2026-08-06 落地）
- [ ] **未建模加成源补建**（部分）—— modron（齿轮）/ 成就 / 药水 / gem 等伤害加成来源接入评估；逐类需核定 amount 与生效条件
  - [x] vulnerability 易伤（场景 `enemyTypes` 匹配 + add/mult pool 聚合，`src/domain/planner/scoring/vulnerabilityFactor.ts`）
  - [ ] modron 齿轮（管道加成）：核心定义不在公开 JSON，存档只存管道配置，社区无完整计算公式；接入需 M2 里程碑（userdetails 导入 + 核心定义数据 + 管道引擎），详见 `docs/research/gameplay/modron-automation.md`「接入不可行性分析」
  - [ ] 成就 / 药水 / gem（planner 无建模）

## 为何暂缓

主体加成（同 key 跨源加法、五通道装备加成、专精注入）已正确建模并稳态。上表中表达式求值器的存档依赖谓词、vulnerability 易伤、装备 / 专精 / feat 手动参数已落地；剩余项中，表达式求值器（`HasEffect` / `ByID`）与 simulator 接入评估链路是多数高阶扩展的前置基建；modron 管道加成经 2026-08-09 深度调研确认接入需 M2 里程碑（核心定义不在公开 JSON + 存档只存管道配置 + 社区无完整计算公式），详见 `docs/research/gameplay/modron-automation.md`「接入不可行性分析」。任何新增能力都必须可解释、可回归验证；无法静态求值的效果不得静默进入目标值。

## 关联

- [damage-bonus-sources.md](../research/data/planner/damage-bonus-sources.md)（未建模来源与补建方向）
- [damage-mechanic-inventory.md](../research/data/planner/damage-mechanic-inventory.md)（机制全貌与里程碑）
- `docs/specs/modules/planner/expression-evaluator.md`（表达式求值器当前态）
- [2026-08-conditional-damage-bonus.md](./2026-08-conditional-damage-bonus.md)（条件性攻击加成，本提案子项）
