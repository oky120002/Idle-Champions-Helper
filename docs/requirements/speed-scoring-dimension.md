# 速度评分维度（team-speed ScoringMode）

**优先级**：待评

## 是什么

将速度从信号维度（`HeroAbilityDimension.speed`，`abilityModel.ts:272`）升级为完整 ScoringMode（`team-speed`），使 planner 能自动推算速度最优阵型。

当前 planner 两种评分模式：`carry-dps`（伤害）、`team-gold`（金币）。README.md:9-11 列出三种核心队伍——DPS 队、金币队、速度队——速度队是唯一未接入 ScoringMode 的（README.md:15 如实登记此缺口）。

### 速度的三个独立可叠加维度

乘法叠加：攻击快 × 过层快 × 跳层 = 总推进速度（`speed-mechanics.md`）。

| 维度 | 数据信号 | 归一化状态 | 消费状态 |
|---|---|---|---|
| 攻击冷却缩减 | `attackSpeedMult`（引擎硬编码上限 75%） | 28 信号 / 16 英雄 | 消费层不收 |
| 过层加速 | `time_scale_when_not_attacked`（Shandie）/ `area_transition_time_scale`（Diana） | 已归一化为 `attackSpeedMult` | 消费层不收 |
| 区域跳过 | `briv_unnatural_haste`（Briv 独占） | champion-details 有数据 | planner 未消费 |

消费层完全不收：`equipmentBuffSignals.ts:34-35` 明确不收 speed/cooldown base 信号（无 `evaluatePlacementFit` 消费方）；`poolScope.ts:27-28` 有 scope 声明但无消费方；`src/domain/planner/` 全目录零 speed 引用。

> **`cooldownReduction` 数据管线缺口**：`speedResolver.ts` 映射 `reduce_ultimate_cooldown` → `cooldownReduction`，已接线（`resolverDispatch.ts:25`），但 hero-abilities.json 中实际 0 信号。原始 champion-details 有 1860 条 `reduce_ultimate_cooldown`（154 英雄），归一化产出缺失——需单独排查管线。`damage-mechanic-inventory.md` 记载"22 attackSpeedMult / ~620 cooldownReduction"与实际数据不符（2026-08-09 Python 核验）。

## 为何暂缓

核心难点是 objectiveValue 量纲设计：速度效益不直接对应像 `carryDps` 那样的标量，需将攻击冷却缩减转化为有效 DPS 放大或过层时间缩减，并融合过层加速与区域跳过两个异构维度。需先调研确定量化模型，再设计评估链路。工程量大，需先设计 objectiveValue 量纲。

## 技术考量

- **新增 ScoringMode `team-speed`**：需设计 `objectiveValue` 量纲（如何量化"最快过层"）
- **攻击冷却缩减**：`attackSpeedMult` → 有效 DPS 放大或 BUD 缩短（当前 BUD 用静态 `baseAttackCooldown`，`budCalculation.ts`；精确建模需动态 cooldown）
- **过层加速**：`time_scale_when_not_attacked` / `area_transition_time_scale` → 过层时间缩减因子
- **区域跳过**：Briv `briv_unnatural_haste` → 期望跳层数（概率 × 堆叠消耗数学，社区已推导）

## 关联

- [speed-mechanics.md](../research/gameplay/speed-mechanics.md)（三个独立维度机制调研）
- [damage-mechanic-inventory.md M1](../research/data/planner/damage-mechanic-inventory.md)（速度队里程碑）
- [planner-capability-extensions.md「综合目标」](./planner-capability-extensions.md)（speed 优化模式列为未落地核心）
