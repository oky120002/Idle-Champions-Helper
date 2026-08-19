# planner 速度维度建模

**状态**: 已落地（2026-08，证据：commit `5952f385` + `docs/specs/modules/planner/architecture.md`）。team-speed 评分模式落地，8 类速度效果（7 静态 + 1 动态 areaSkip）+ 三层缩放（装备/阵型/专精）+ PlannerSpeedBreakdown UI。

## 是什么

将已解析但未被评分消费的攻击速度 / 冷却缩减信号接入 planner 评分链路，使速度队英雄（Briv、Widdle、Deekin、Shandie 等）在推荐结果中获得正确评分。

## 背景

### 速度是三大核心策略之一

Idle Champions 的推进速度由三个独立可叠加的维度决定（调研 `speed-mechanics.md`）：

| 维度 | 数据信号 | 归一化状态 | 消费状态 |
|---|---|---|---|
| 攻击冷却缩减 | `attackSpeedMult`（引擎硬编码上限 75%） | 22 信号 / 16 英雄 | 消费层不收 |
| 过层加速 | `time_scale_when_not_attacked`（Shandie）/ `area_transition_time_scale`（Diana） | 已归一化为 `attackSpeedMult` | 消费层不收 |
| 区域跳过 | `briv_unnatural_haste`（Briv 独占） | champion-details 有数据 | planner 未消费 |

三者乘法叠加。速度队不是用 DPS 换速度，而是速度英雄本身也贡献 BUD——但只有冷却缩减能被静态评估直接量化。

### 当前缺口：642 个信号浪费

planner 评分链路解析了攻速信号但完全不消费：

- `attackSpeedMult`：22 个信号（`hero-abilities.json` 实测，来自 upgrade/ability 源），对应 `reduce_attack_cooldown,X` / `time_scale` 等英雄能力
- `cooldownReduction`：hero-abilities.json base profile 中 **0 个**——非管线 bug，2026-08-09 排查确认：624 条 `reduce_ultimate_cooldown` effect_string 分两路——12 条专精源正确进 `specialization-catalog.json`（`cooldownReduction` 12 条已验证）；612 条装备源被 `buildHeroModels` loot 过滤（防双重计数，正确行为），但装备五通道（`SIMPLE_VALUE_KINDS`）不含 speed/cooldown kind，无 owned-aware 通道接手。此缺口随本需求一并解决（见 TODO `atd_0cb934b094`）。

评分链路 5 处显式排除速度维度：
1. `evaluatePlacementFit` 只传 `dimension: ['damage', 'crit', 'vulnerability']` 和 `'survival'`——从不传 `'speed'`
2. `placementFit.ts` 的 dimensionFilterSet 直接过滤掉所有非指定维度的 signal
3. `OBJECTIVE_DIMENSIONS`（`computationMode.ts:27`）只映射 damage/crit/vulnerability/gold
4. `equipmentBuffSignals.ts:34-35` 的 `SUPPORTED_BUFF_TARGET_KINDS` 显式排除 `attackSpeedMult`；`poolScope.ts:27-28` 有 scope 声明但无消费方
5. 有专门测试断言"attackSpeed/cooldown 暂不收"

根因：BUD 计算用 carry 英雄自己的 `baseAttackCooldown`（per-hero，已有），但不反映阵型中其他英雄提供的 `attackSpeedMult` 缩减。需要把阵型级攻速缩减纳入 BUD 计算。

### 冷却缩减上限与机制

- **75% 上限**（社区 + 数据交叉确认，引擎硬编码）：基础冷却 4 秒 → 最低 1 秒
- 16 名英雄拥有 `reduce_attack_cooldown` 信号（莱埃泽尔 4.0s、维列瑟琳 3.0s 等）
- Widdle 特殊：用 `widdle_base_attack_cooldown_override` 直接覆盖相邻英雄冷却，另带 25% 概率重置冷却，不占 75% 名额
- Briv 跳层数学：`n = LN(50/S) / LN(1-r)`，r=0.04 或 0.032（专精 Metalborn）；`briv_unnatural_haste` 在 champion-details 有数据，planner 未消费

### 社区工具现状

ic.byteglow.com 有 Speed 页面（社区速度计算器），但仅展示英雄速度标签，不做 BUD 或 DPS 计算。社区没有工具能把"攻速缩减"翻译成"DPS/BUD 提升"。

## 需要做什么

### 核心认知修正（2026-08-10）

速度 ≠ 杀怪快慢。速度英雄通过 11 类完全不同的机制加速过层（跳层/任务需求缩减/任务进度倍增/敌人刷新加速/额外刷新/游戏加速/区域转换加速/条件过关/同步刷新/预刷新/初期冲层），与 DPS/BUD 正交。详细机制分析见 `docs/research/gameplay/speed-mechanics.md`。

**放弃「动态 BUD」方案**——攻速缩减降低 cooldown → 降低单次命中伤害 → 降低 BUD（IC 真实机制：慢攻击英雄更容易设 BUD）。把 DPS 当 BUD 会严重高估面积估算。

### 阶段一：速度效果建模（基建）

将 11 类速度效果建模为**区域推进效率因子**（详见 speed-mechanics.md「速度效益量化模型」）：

- **可静态计算的效果**（类型 2-7、9-10）：任务需求缩减、任务进度倍增、刷新加速、额外刷新、游戏加速、区域转换加速、同步刷新、预刷新 → 各自一个乘数因子
- **需假设值的效果**（类型 1、8、11）：Briv 跳层（跨重置堆叠）、Lae'zel/Halsin 条件过关（触发频率）、Thellora 初期冲层（favor 依赖）→ 用户输入假设值

输出：`speedMultiplier`（阵型级综合速度因子），而非 DPS/BUD 改动。

### 阶段二：team-speed 评分模式

新增 `ScoringMode = 'team-speed'`（与 `carry-dps` / `team-gold` 并列）：

- `objectiveValue` = `speedMultiplier`（区域推进效率，越高越快）
- 不影响 carry-dps 模式的 BUD/DPS 计算——速度是独立优化目标
- beam search 按 speedMultiplier 排序，推荐速度最优阵型

### 不建模的部分

- **精确过层时间模拟**（逐区击杀时间线）：依赖运行时敌人刷新逻辑，超出静态评估范围
- **Briv 钢骨自给自足计算**：需跨重置模拟，标记为假设输入
- **Modron 速度核心 buff**：数据不可得（serverOnly），随 M2 里程碑

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

速度维度是**最高价值单一缺口**（里程碑 M1），也是工程量最大的。核心挑战不是 BUD 改造（已否决），而是：

1. **11 类异构机制**需逐类建模——每类有不同的数学结构和数据依赖（详见 speed-mechanics.md）
2. **objectiveValue 量纲设计**——速度效益不直接对应标量，需将异构效果融合为统一的「区域推进效率」指标
3. **运行时依赖**——3 类效果（Briv 跳层 / 条件过关 / 初期冲层）需用户假设值或跨重置状态
4. **效果数据不在 hero-abilities 信号池**——速度效果多为 hero-specific handler（`minsc_boastful` / `hewmaan_fellow_humans` 等），需从 champion-details 原始数据提取而非复用现有信号管线

## 关联

- 调研：`docs/research/gameplay/speed-mechanics.md`（11 类机制全貌 + 社区 Speed 101）
- 社区来源：[Speed Champions 101 — Gaarawarr](https://www.reddit.com/r/idlechampions/comments/1aleren/speed_champions_101_an_introduction/)、[Steam — Briv+Hew Maan 自动化攻略](https://steamcommunity.com/sharedfiles/filedetails/?id=2615977602)、[Steam — Briv 跳层数学](https://steamcommunity.com/app/627690/discussions/0/1872875054775725577/)、[Byteglow Speed](https://ic.byteglow.com/speed)
- 里程碑：`docs/research/data/planner/damage-mechanic-inventory.md` §8 M1
- 需求：`2026-08-planner-capability-extensions.md`（逐步模拟子项）
- 关联需求：`2026-08-planner-area-dashboard.md`（推图仪表盘，依赖动态 BUD）
- 代码：`src/domain/simulator/budCalculation.ts`、`areaEstimation.ts`
