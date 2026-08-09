# planner 速度维度建模

**优先级**：待评

## 是什么

将已解析但未被评分消费的攻击速度 / 冷却缩减信号接入 planner 评分链路，使速度队英雄（Briv、Widdle、Deekin、Shandie 等）在推荐结果中获得正确评分。

## 背景

### 速度是三大核心策略之一

Idle Champions 的推进速度由三个独立可叠加的维度决定（调研 `speed-mechanics.md`）：

1. **攻击冷却缩减**：缩短英雄攻击间隔 → 单位时间打出更多次攻击 → BUD 上升
2. **过层加速**：加快敌人刷新、减少击杀需求、缩短区域转换 → 每层停留时间缩短
3. **区域跳过**（Briv 独占）：直接跳过整个区域，跳过的 boss 奖励照常发放

三者乘法叠加。速度队不是用 DPS 换速度，而是速度英雄本身也贡献 BUD——但只有冷却缩减能被静态评估直接量化。

### 当前缺口：642 个信号浪费

planner 评分链路解析了攻速信号但完全不消费：

- `attackSpeedMult`：28 个信号（`hero-abilities.json` 实测），对应 `reduce_attack_cooldown,X` 的英雄能力
- `cooldownReduction`：类型存在但 **0 个信号产出**（类型预留，parser 从未生成此 kind）

评分链路 5 处显式排除速度维度：
1. `evaluatePlacementFit` 只传 `dimension: ['damage', 'crit', 'vulnerability']` 和 `'survival'`——从不传 `'speed'`
2. `placementFit.ts` 的 dimensionFilterSet 直接过滤掉所有非指定维度的 signal
3. `OBJECTIVE_DIMENSIONS` 只映射 damage/crit/vulnerability/gold
4. `equipmentBuffSignals.ts` 的 `SUPPORTED_BUFF_TARGET_KINDS` 显式排除 `attackSpeedMult`
5. 有专门测试断言"attackSpeed/cooldown 暂不收"

根因：BUD 计算用 carry 英雄自己的 `baseAttackCooldown`（per-hero，已有），但不反映阵型中其他英雄提供的 `attackSpeedMult` 缩减。需要把阵型级攻速缩减纳入 BUD 计算。

### 冷却缩减上限与机制

- **75% 上限**（社区 + 数据交叉确认，引擎硬编码）：基础冷却 4 秒 → 最低 1 秒
- 16 名英雄拥有 `reduce_attack_cooldown` 信号（莱埃泽尔 4.0s、维列瑟琳 3.0s 等）
- Widdle 特殊：用 `widdle_base_attack_cooldown_override` 直接覆盖相邻英雄冷却，另带 25% 概率重置冷却，不占 75% 名额
- Briv 跳层数学：`n = LN(50/S) / LN(1-r)`，r=0.04 或 0.032（专精 Metalborn）

### 社区工具现状

ic.byteglow.com 有 Speed 页面（社区速度计算器），但仅展示英雄速度标签，不做 BUD 或 DPS 计算。社区没有工具能把"攻速缩减"翻译成"DPS/BUD 提升"。

## 需要做什么

### 阶段一：动态 BUD（前置基建）

社区确认 BUD 公式：`BUD = 最高单次伤害 / 攻击间隔`（[BUD 101](https://www.reddit.com/r/idlechampions/comments/fnoaal/)）。攻速是分母——攻速越快，BUD 越高。

将 `budCalculation.ts` 从仅用 carry 自身冷却升级为纳入阵型级缩减：

- 输入：阵型中所有 `attackSpeedMult` 信号（相邻/全队冷却缩减）+ Widdle 特殊覆盖
- 处理：`effectiveCooldown = max(carryBaseAttackCooldown × (1 - totalReduction), carryBaseAttackCooldown × 0.25)`
- 输出：动态 BUD = `carrySingleHitDamage / effectiveCooldown`（当前是 `/ baseAttackCooldown`）

### 阶段二：速度评分维度

新增 `ScoringMode = 'speed'`（与 `carry-dps` / `team-gold` 并列），或在现有 `carry-dps` 模式下将动态 BUD 替代静态 BUD：

- 动态 BUD 影响 `objectiveValue`（carryDps = BUD-based），使速度英雄的贡献反映在评分中
- `areaEstimate` 自动受益（BUD 上升 → 可推区域上升）

### 不建模的部分

- **过层加速**（Deekin 刷新、Sentry 击杀门槛、Hew Maan 击杀数缩减）：依赖运行时敌人刷新逻辑，静态评估不可消费
- **Briv 跳层**：依赖跨重置持久状态（钢骨堆叠），单冒险快照不可得；且跳层影响的是过层效率而非 DPS
- **Shandie 游戏加速**：`time_scale_when_not_attacked,25,30` 是全局游戏速度 ×1.25，影响所有速率但不改变 BUD 本身

## 已有基建

| 组件 | 位置 | 状态 |
|---|---|---|
| `attackSpeedMult` 信号解析 | `HeroAbilityKind` + 信号池 | ✅ 已解析，28 信号 |
| `cooldownReduction` 信号解析 | `HeroAbilityKind` 类型已定义 | ⚠️ 0 信号产出（类型预留，parser 未生成） |
| BUD 计算 | `src/domain/simulator/budCalculation.ts` | ⚠️ 用 carry 自己的 baseAttackCooldown，不含阵型级缩减 |
| 面积估算 | `src/domain/simulator/areaEstimation.ts` | ✅ 已接 BUD，升级后自动受益 |
| ScoringMode 类型 | `src/domain/planner/steadyStateScoring.ts:24` | 扩展点：新增 `'speed'` 或融入 `carry-dps` |
| 英雄速度标签 | champion-tags | ✅ 已有 `speed` 标签分类 |

## 为何暂缓

阶段一（动态 BUD）是**最高价值单一缺口**（里程碑 M1），但也是工程量最大的：需要把 BUD 从单常量改为依赖阵型上下文的派生值，涉及 budCalculation → areaEstimation → scoring 全链路改动。阶段二相对轻量。

此需求与 [[2026-08-planner-area-dashboard]]（推图仪表盘）强耦合——准确的可推层数依赖动态 BUD。

## 关联

- 社区来源：[Speed Champions 101](https://www.reddit.com/r/idlechampions/comments/1aleren/speed_champions_101_an_introduction/)、[BUD 101](https://www.reddit.com/r/idlechampions/comments/fnoaal/bud_base_ultimate_damage_101_an_introduction/)、[Briv 跳层路线计算器](https://emmotes.github.io/ic_scripting_routes/)、[Byteglow Speed](https://ic.byteglow.com/speed)
- 调研：`docs/research/gameplay/bud-mechanics.md`（BUD 定义与衰减规则）
- 里程碑：`docs/research/data/planner/damage-mechanic-inventory.md` §8 M1
- 需求：`planner-capability-extensions.md`（逐步模拟子项）
- 关联需求：`2026-08-planner-area-dashboard.md`（推图仪表盘，依赖动态 BUD）
- 代码：`src/domain/simulator/budCalculation.ts`、`areaEstimation.ts`
