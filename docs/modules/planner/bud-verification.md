# BUD 计算实测验证（阶段 7.5）

> 作用：记录 BUD（Biggest Unique Damage）计算公式、与游戏内显示的对照方法与校准结论。
> 架构决策见 `evolution-plan.md`「BUD 对阵型模拟的价值」；实现见 `src/domain/simulator/budCalculation.ts`。

## 公式

```
singleHit(hero) = heroDps × attackCooldown
BUD(formation)  = max over placed heroes of singleHit(hero)
```

- `heroDps`：英雄每秒伤害（MVP 用 carryDps = baseDamage × levelCurve × 加成聚合 近似；未含 click/ult 对单次的放大）。
- `attackCooldown`：英雄基础攻击间隔（秒/次），来自 `champion-details.attacks.base.cooldown`，已提取到 `profile.baseAttackCooldown`。
- 推导：DPS = 伤害/秒，cooldown = 秒/次 → 单次伤害 = (伤害/秒) × (秒/次) = 伤害/次。
- IC 机制：怪物血量按阵型 BUD 缩放；慢攻击（高 cooldown）英雄单次伤害更高，更易成为 BUD setter。

## MVP 近似与局限

- carryDps 当前不含攻速（`baseDps.ts` 未除 cooldown），用作 heroDps 时与「真·每秒」存在系统性偏差；阶段 7.2 决定 **speed 暂不进 carryDps**，BUD 作为 speed 感知的辅助指标并行计算。
- `computeSingleHitDamage` 未含 BUD 专属放大（click damage、ult 对单次、BUD-setter 标签加成），绝对值偏低；相对比较（谁设 BUD）保序。
- ult_damage 派生（`ultimate_damage_params.dps_based:true`）留 stage 14 modron uptime。

## 实测对照方法（需用户配合游戏）

目标：计算 BUD 与游戏内显示 BUD 偏差 **< 30%**。

1. 选一个已知阵型（记录各英雄 id、等级、装备）。
2. 游戏内查看阵型 BUD 显示值（战斗界面 / 详情）。
3. 用 `computeBud`（输入各英雄 carryDps × baseAttackCooldown）计算。
4. 记录下表，计算偏差 = |计算 − 实测| / 实测。

## 实测数据

> 待用户填入游戏实测。偏差 > 30% 时回查公式（最可能根因：heroDps 近似缺攻速/click、cooldown 字段取值、BUD-setter 标签加成未建模）。

| 阵型 | carryDps setter | cooldown | 计算 BUD | 游戏实测 BUD | 偏差 |
|------|-----------------|----------|----------|--------------|------|
| _待填_ | _待填_ | _待填_ | _待填_ | _待填_ | _待填_ |

## 结论

- 公式已实现并单测覆盖（`budCalculation.test.ts`：单次伤害、慢攻击 BUD 更高、cooldown 回退、空阵型）。
- 绝对值实测校准 pending 用户游戏内数据；阵型推荐 MVP 仍以 carryDps 优化，BUD 为辅助指标。
