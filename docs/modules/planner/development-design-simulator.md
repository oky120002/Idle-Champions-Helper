# Planner 模拟器与搜索设计

## GameNumber

引入 `break_eternity.js`，但只在 `src/domain/simulator/game-number.ts` 中直接 import。业务代码只用 wrapper：

- `parseGameNumber`
- `formatGameNumber`
- `multiplyGameNumbers`
- `divideGameNumbers`
- `powGameNumber`
- `addGameNumbers`
- `compareGameNumbers`
- `toLog10`

性能策略：

- 排序和 beam search 优先比较 `log10` 或 wrapper compare，不构造巨型十进制字符串。
- 加法使用集中阈值，初始阈值为 12 个数量级；小项不会影响 3 位游戏显示时直接忽略。
- 显示层默认 `1.50e92` 风格；不要用 JS `number` 承载最终伤害。
- 需要现在就支持超过 `Number.MAX_VALUE` 的普通科学计数和更后期数值，避免后续再换核心数值类型。

## 基线算法

默认基线是“最后专精 + 金币预算”：

```text
extractLastSpecializationUnlockLevel(champion upgrades)
estimateAffordableLevel(cost curve, gold budget, favor/blessing context)
baselineLevel = max(lastSpecializationLevel, affordableLevel if affordable)
```

如果金币预算不足以达到最后专精，结果标记 `below-baseline`，并在 UI 中显示为不可靠候选。固定 1 级只作为 parser 与 fixture smoke test；不提供默认 100 级模式。

## 模拟范围

第一版计算可预计算的稳态伤害：

- global DPS multiplier
- hero DPS multiplier
- adjacent support
- tagged champion multiplier
- 明确可投影的位置或阵营条件

第一版只标记、不计入评分：

- 随机触发
- 击杀过程
- 逐区时间线
- 敌人实时状态
- 临时 buff
- 动态堆叠
- 同时期互斥或无法静态判断的效果

未知 effect 必须进入 `warnings` 和 `unsupportedEffects`，不能静默忽略。

## 候选池和公平假设

候选模式：

- `owned-only`：只使用账号快照中已拥有英雄，按真实装备、feat、传奇、专精和已保存阵型信息计算。
- `all-hypothetical`：包含未拥有英雄，默认使用公平投影假设。
- `manual-override`：允许手动指定装备、feat、专精和传奇等级，不修改原始 snapshot。

未拥有英雄公平基线：

- 同 seat 已拥有英雄足够时，使用同 seat 中位装备/feat/传奇假设。
- 同 seat 不足时，使用账号全局中位数。
- 空账号或数据不足时，退回 `no-equipment/no-feat`，并强制显示 assumption。

## 搜索和评分

合法性先于评分：

- seat 冲突
- banned champions
- forced champions
- locked/occupied slots
- formation layout mismatch

第一版使用 deterministic beam search。默认参数由领域常量集中管理，不写死在 UI 中：每个 seat 保留 Top N、主 DPS Top N、beam width、result count。结果排序必须稳定，同分使用 deterministic tie-breaker。

## UI 和测试

Planner 页面是工作台，不是 landing page。

- profile 状态：无快照、快照年龄、warnings、手动刷新入口、删除入口。
- scenario 区：variant 搜索、formation layout、限制摘要。
- candidate 区：owned-only、all-hypothetical、manual override。
- baseline 区：金币预算、最后专精状态、below-baseline warning。
- result 区：Top 3-5，显示游戏记数法 score、slot assignments、核心解释和 unsupported warnings。
- save 区：把有效结果保存到现有 formation preset。

测试覆盖：

- 数字：`1.50e92`、`4.08e167`、`1e1000`、加法阈值、排序稳定性。
- 模拟器：最后专精、金币预算、effect parser、unsupported warning。
- Planner：候选池、合法性、稳态评分、beam search。
- UI：profile 状态、场景选择、结果卡、保存 preset。
