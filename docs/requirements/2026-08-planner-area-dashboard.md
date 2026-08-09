# planner 推图进度仪表盘

**优先级**：待评

## 是什么

把 planner 算出的抽象 DPS 数字翻译成玩家听得懂的「能推到第几层、卡在哪里、怎么提升」，作为独立面板展示在阵型评估结果旁边。

## 背景

### 玩家最常问的问题

Reddit/Steam 社区反复出现一个问题：「我的阵型能推到多少层？」（如 [Formation Calculator?](https://www.reddit.com/r/idlechampions/comments/ld8my9/formation_calculator/) — *「有没有一个网站，输入阵型数据后算出能推多远？」*）。社区没有好的回答——ic.byteglow.com 有 Formation 页面但不做区域估算。

本站的产品定位是「个人成长导向阵型决策台」，但当前 planner 的输出是 `carryDps: "1.2e35"` 这样的数字——玩家不理解它意味着什么。即使 planner 推荐了最优阵型，玩家也无法判断「换这个阵型后能多推 50 层还是只多 5 层」。

### 已有基建但未暴露

simulator 层已有 `areaEstimation.ts`，在评分结果 `ScoringResult.areaEstimate` 中返回推图层数预估——但仅作为辅助字段嵌在结果对象里，没有独立面板展示，没有瓶颈分析，没有改进建议。

### 三种墙类型

调研 `pushing-and-wall.md` 确认了墙的三种类型：

| 类型 | 根因 | 表现 | 本站能做什么 |
|---|---|---|---|
| **DPS 墙（软墙）** | 血量增长 > 伤害增长 | 怪物杀不死，但队伍不会死 | 告诉玩家 DPS 还差多少、换什么英雄能补 |
| **生存墙** | 怪物伤害 > 坦克/治疗承受 | 队伍被击杀 | 告诉玩家生存维度不够、需要加坦克/治疗 |
| **硬墙** | 2451+ boss 伤害 ×100 亿 | 数学上不可能通过 | 告诉玩家这是设计极限，不是阵型问题 |

目前 `areaEstimation` 只做了 DPS 墙的估算（BUD vs 怪物血量），生存墙有 `survivalCalculation.ts` 但未集成到面积估算中。

### 怪物血量公式

游戏数据直接给出（`game-rules.json` → `monster_base_stats`）：

```
health = 10 × growth_rate^(area - 1)
```

分段增长率：1-2000 层 2.031，2001-2250 层 3.031，2251+ 层 4.531。Boss 层（每 50 层）额外 ×1.9。

社区经验法则：每 100 区域约需 e30 伤害增量。

## 需要做什么

### 子项一：推图层数面板

在评估结果区域新增独立面板，展示：

- **当前预估层数**：`areaEstimate` 的值，用大字号显示（如「预估 847 层」）
- **DPS vs 血量对照**：当前 BUD 与该层怪物血量的对比，让玩家直观看到差距
- **墙类型标注**：如果预估层数接近生存墙，标注「生存瓶颈」；如果接近硬墙（2451），标注「设计极限」

### 子项二：瓶颈分析

回答「卡在哪里」：

- **DPS 瓶颈**：BUD 与目标层怪物血量的比值。差距 10× 以内 = 换一件装备/一个英雄可能突破；差距 100× 以上 = 需要质变（如换核心英雄、提升恩宠等级）
- **生存瓶颈**：effectiveHealth 与该层怪物伤害的比值。激活生存维度后展示
- **金币瓶颈**：当前金币产出能否支撑英雄升级到足够等级。gold-and-favor 衰减曲线

### 子项三：改进方向建议

回答「怎么提升」：

- **DPS 维度**：列出当前阵型中贡献最低的 1-2 个槽位，推荐替代英雄（复用 planner 推荐引擎的候选池）
- **生存维度**：如果生存不够，推荐增加坦克/治疗/减伤英雄
- **速度维度**：如果当前阵型不含速度英雄但用户在做宝石农场，提示速度队的过层效率优势

### 不做的部分

- **精确到秒的过层模拟**（逐区击杀时间线）：依赖运行时敌人刷新逻辑，超出静态评估范围
- **Modron 自动重置建议**：需要 modron 配置数据（当前不导入）
- **药水/契约 buff 预估**：需要私有存档深度导入（见 `planner-capability-extensions.md` M2）

## 已有基建

| 组件 | 位置 | 状态 |
|---|---|---|
| 区域估算 | `src/domain/simulator/areaEstimation.ts` | ✅ BUD → maxArea 已实现 |
| 怪物血量公式 | `game-rules.json` → `monster_base_stats` | ✅ 数据完整（分段增长率 + boss 倍率） |
| 生存计算 | `src/domain/simulator/survivalCalculation.ts` | ✅ effectiveHealth 已实现 |
| 金币曲线 | `game-rules.json` → `health_gold_ratio` | ✅ 47 段递减已入数据 |
| BUD 计算 | `src/domain/simulator/budCalculation.ts` | ⚠️ 静态冷却，需 [[2026-08-planner-speed-dimension]] 升级后才能准确估算含速度英雄的阵型 |
| ScoringResult | `src/domain/planner/steadyStateScoring.ts:154` | ✅ areaEstimate 已在结果中 |

## 为何暂缓

子项一（推图层数面板）可以基于现有 `areaEstimate` 直接做，工程量小。子项二（瓶颈分析）和子项三（改进建议）需要更深的分析逻辑和 UI 设计。准确度上依赖 [[2026-08-planner-speed-dimension]]（动态 BUD）——如果 BUD 不含速度贡献，含速度英雄的阵型推图估算会偏低。

## 关联

- 调研：`docs/research/gameplay/pushing-and-wall.md`（推图与墙机制全貌）
- 调研：`docs/research/gameplay/bud-mechanics.md`（BUD 定义）
- 关联需求：`2026-08-planner-speed-dimension.md`（动态 BUD 是准确推图估算的前置）
- 关联需求：`2026-08-planner-viability-warning-upgrades.md`（可行性模型中的生存/暴击门控升级）
- 代码：`src/domain/simulator/areaEstimation.ts`、`survivalCalculation.ts`
