# 搜索、排序与输出合同

## 推荐流水线
```text
scenario + layout
  -> 读取 resolved scenario model
  -> 选择或枚举 C 位
  -> 构建候选池
  -> 计算模式裁剪（applyComputationMode：按席位复合收益取前 full/p90/p50 比例，forced 必留）
  -> 读取 resolved hero models
  -> 计算 hero-slot 加成聚合（PoolAggregateResult）
  -> 运行完整阵型搜索
  -> 输出 Top K 完整阵型
  -> 从 Top K 派生槽位替补和 seat 竞争
```
- 手动模式：用户先锁定一个 C 位，系统只围绕它推荐。
- 自动模式：系统枚举所有已放置英雄作为 C 位候选，由实际 `carryDps` 决定最优 C 位，完整阵型搜索结果按 distinct-carry Top K 返回（见 §7 输出合同）。
- 无论手动还是自动，完整阵型搜索时都必须有且仅有一个主 C 位。
- 引擎支持 `owned-only / all-hypothetical` 两种候选模式，默认 `owned-only`。
- 同 seat 冲突属于硬约束，在搜索前就生效。
- 搜索单位是**完整阵型**，不是逐槽位贪心挑人。
- 继续采用 deterministic beam search。
- 目标从“把高权重英雄塞满队”改成“最大化当前 C 位输出代理值”。
- 逐槽位推荐只能从 Top K 或 near-optimal 合法阵型集合中派生。

## 评分规则
- 主评分只看 `carryDps`：C 位 `baseDamage × levelCurve × 加成聚合`，涵盖自增伤、对 C 位生效的全队增伤、位置增伤、标签/阵营/职业/性别条件增伤，以及会反映到 C 位有效输出的敌方承伤/易伤类效果。
- 不计入主评分：非 C 位自身 DPS、整队总伤害、敌对单位血量、击杀判定、过关门槛，以及无法稳定解析的规则。
- `carryDps` 接近时，再比较：激活条件覆盖更完整、warning 更少、启发式依赖更少、结果更稳定且约束满足更干净。

## 语义优先级
1. 显式已解析规则
2. 场景 / 布局硬约束
3. 槽位拓扑事实
4. 可解释启发式
5. unsupported / unknown

固定红线：
- 不能只凭 `row`/`column` 武断写死“前排/后排”。
- 不能只因英雄有 `tank`/`support` 标签，就默认适合当前 C 位。
- unsupported 规则不能偷偷计入分数。
- 不能把“需要手动触发 / 专精选择 / 私有叠层语义”的效果硬算进主分。
- 启发式命中必须标记 `heuristic-fallback`。

## 输出合同
> 当前输出合同以 `src/domain/planner/recommendationTypes.ts` 代码为准；下面是字段概要。
- 主结果为 `PlannerRecommendation`：`result`（top1，= `results[0]`）、`results`（distinct-carry Top K 完整阵型）、`slots`（棋盘槽位拓扑，供结果卡片复用渲染）、`layoutId`、`scenarioRef`、`blocker`（缺画像 / 缺阵型 / 拥有英雄不足 / 无合法推荐）。
- `PlannerResult` 至少包含：`objectiveValue`（当前模式目标量游戏记数法字符串；carry-dps=carryDps / team-gold=teamGoldFind）、`carryHeroId`、`placements`、`placementEntries`、`explanations`（结构化叙述行 `PlannerNarrativeLine[]`）、`warnings`、`areaEstimate`（推图层数预估）、`breakdown`（`SimulationBreakdown` 加成拆解）。
- 逐槽位替补与同席位竞争从 Top K 完整阵型结果派生；当前结果合同不包含独立的 `slotAlternatives` / `seatCompetition` 字段。

## 验收场景
- 相邻增益英雄与 C 位相邻时，完整阵型分数高于不相邻摆法。
- 同一类叠层效果在 `add` 与 `mult` 下，最终 multiplier 必须不同。
- `stat_score` / `stat` / `age` 这类限定会真正影响 carry 命中和 formation 计数结果。
- 顶部 / 身后 / 同列 / 前后范围规则会真正改变站位选择。
- 同 seat 双英雄竞争时，Top 1 只能保留一人，但另一人必须出现在 `seatCompetition` 或槽位替补里。
- 非 `输出` 标签英雄也能进入 C 位枚举；C 位由实际 `carryDps` 排序决定，不再受角色标签门控。
- 仓库语义补丁和浏览器本地 override 都能改变推荐解释来源。
- unsupported 规则只进入 warning，不进入主评分。

## 不做的范围
- 敌对单位血量模型
- “是否能击杀当前敌人”的门槛判定
- 逐帧战斗模拟
- 多目标评分：速度、金币、生存、平衡混合分
- 视觉交互和页面样式设计
