# 阵型推荐英雄与站位设计
- 目标：把“推荐英雄 + 推荐站位”沉成长期稳定的 planner 设计事实源，避免后续继续在页面、脚本或测试夹具里临时拼规则。
- 当前状态：仓库已有 `planner` 页面、候选池、合法性、beam search 与基础评分雏形，但当前推荐仍偏向角色权重拼队，不等于真正的 C 位驱动站位推荐。
- 边界：本文只定义纯算法与数据模型，不展开视觉稿、交互稿或逐帧战斗模拟。

## 1. 核心结论
- 推荐目标不是整队总 DPS，而是**单一 C 位英雄的最终输出代理值**。
- 一个阵型必须先确定 C 位，再围绕这个 C 位选择 support、站位和激活条件。
- 非 C 位英雄的价值，只通过“是否提高当前 C 位输出”来计分；其自身输出不进入主评分。
- 后期推关语境下，默认关键技能都已解锁；首期不考虑技能等级门槛。
- 不同关卡 / 变体的阵型布局不同，推荐必须绑定具体 `scenario + formation layout`。
- 官方不会提供可靠的敌对单位血量模型；planner 首期也**不需要**考虑敌方血量，只疯狂堆高 C 位输出代理值。

## 2. 数据分层与 merge
- 推荐引擎不直接读取零散的 `champion-details`、`variants`、`formations` 和原始 effect string 做现场聚合，而是统一消费 merge 后的 planner model。
- 官方归一化 planner model：由官方数据获取流水线新增一步“阵型推荐归一化”，产出到 `public/data/v1/planner-heroes.json` 与 `public/data/v1/planner-scenarios.json`。
- `planner-heroes.json`：每个英雄的推荐专用画像，包含 carry 可行性、support 语义、位置条件、标签条件、增伤方向、unsupported 缺口。
- `planner-scenarios.json`：每个 scenario 的布局、锁槽、强制/禁用英雄、拓扑关系、目标区域等推荐输入。
- 仓库语义补丁：新增 `scripts/data/planner-semantic-overrides.json`，补官方自动解析拿不到或不稳定的语义，例如顶部/底部、前后、同列、身后、职业/性别/阵营/角色条件、carry 例外、特殊激活条件。
- 浏览器本地 override：新增 IndexedDB store `plannerHeroOverrides`，按英雄全局存储，只允许覆盖 planner 语义字段；不改原始官方英雄详情，不改公共静态产物，不进生产构建。
- 固定优先级：`官方 planner model < 仓库语义补丁 < 浏览器本地 override`。
- 推荐引擎、模拟器和后续审查只读 merge 后的 resolved model，不再到处拼源数据。

## 3. 核心模型
- `ResolvedPlannerHeroModel` 至少包含：`heroId`、`seat`、`roles`、`tags`、`age`、`abilityScores`、`isCarryViable`、`carrySignals`、`supportSignals`、`targetQualifiers`、`formationCountQualifiers`、`positionQualifiers`、`effectMultipliers`、`unsupportedSignals`、`sourceBreakdown`。
- `isCarryViable`：是否允许进入 C 位枚举；默认优先 `输出` 标签英雄，但允许例外英雄被语义层显式标记为可当 C 位。
- `carrySignals`：英雄自身提高自己输出的规则。
- `supportSignals`：该英雄如何提高别人输出，尤其是如何提高当前 C 位输出。
- `sourceBreakdown`：记录每条语义来自官方解析、仓库补丁还是本地 override。
- `ResolvedPlannerScenarioModel` 至少包含：`scenarioRef`、`formationLayoutId`、`objectiveArea`、`slotTopology`、`forcedHeroes`、`bannedHeroes`、`lockedSlots`、`scenarioWarnings`。
- 首期不把 `objectiveArea` 用于敌方血量计算，只作为场景身份和布局上下文。
- `PlacementFit` 表示“某英雄站在某槽位时，对当前 C 位的贡献”，至少包含：`heroId`、`slotId`、`carryHeroId`、`fitScore`、`scoreBreakdown`、`reasonCodes`、`warnings`、`fallbackSource`。

### 3.1 PlacementFit 最小合同
- 推荐问题先拆成最小确定性单元：`evaluatePlacementFit(carryHero, carrySlot, supportHero, supportSlot, scenario)`。
- 这个函数只回答一件事：当前 support 站在当前槽位时，是否真正提高了当前 C 位；若提高，具体提高多少；若没提高，原因是什么。
- `fitScore` 只表示这一个 support 对这一个 carry 的乘区贡献，不负责整队搜索，不负责 UI 文案。
- 当前首期固定把 effect 数值按百分比解释：`100 => +100% => x2.0`，`50 => +50% => x1.5`。
- 但 effect 的**组合方式**不能一刀切：同一类 signal 可能是加法叠层，也可能是乘法叠层；必须显式保留 `amountFunc + stackFunc`，不能只看 `value`。
- `scoreBreakdown` 的每一条都必须带 `signalKind`、`rawEffect`、`multiplier`、`active`、`reasonCode`、`source`。

### 3.2 PlacementFit 判定顺序
1. 先确定当前 signal 是否属于这名英雄当前站位下可评估的信号。
2. 再判断位置条件是否满足，例如 `adjacent / self / any`。
3. 再判断目标条件是否满足，例如 `female / male / role / tag / alignment`。
4. 命中后按 signal 的组合语义计算 multiplier：普通百分比直接换算；formation 计数类再结合 `amountFunc + stackFunc` 求值。
5. 未命中只记录原因，不计分。
6. 语义缺失、需要手动触发、或组合方式还不稳定的规则，只进入 `warnings`，不偷偷加分。

### 3.3 当前代码首期已支持的条件
- `globalDpsMultiplier`：默认对 carry 生效。
- `heroDpsMultiplier`：默认只对 carry 自身生效。
- `adjacentBuff`：默认要求 support 与 carry 相邻。
- `taggedChampionBuff`：只有在 planner model 明确提供 `targetQualifier.requiredTags` 或 `requiredStats` 时才计分；否则只给 warning。
- carry 目标限定已支持：`requiredTags`、`excludedTags`、`requiredStats`。
- formation 计数限定已支持最小子集：`per_crusader`、`per_tagged_crusader_mult`、`per_hero_attribute`。
- formation 计数限定当前可消费的 qualifier 子集：正向/排除标签、能力值阈值、基础攻击伤害类型、基础攻击冷却阈值、年龄上下界、排除指定英雄。
- 简单别名谓词当前只支持能稳定映射到静态事实源的子集，例如 `is_undead -> requiredTags: ['undead']`。
- 简单布尔组合当前支持受控子集：单纯由静态 tag / stat / age 子句组成的 `&&` 组合可以合并成同一个 qualifier。
- 简单布尔包装当前支持受控子集：`as_int(<已支持静态谓词>)` 会退化回内部谓词本身；只要内部仍依赖动态变量、公式或运行时状态，就继续保持 unsupported。
- 年龄比较当前保留原始比较方向，`<` / `<=` / `>` / `>=` 不再被粗暴折叠成同一个上下界。
- 英雄画像当前已额外保留 `baseAttackCooldown` 静态事实，可供 `base_attack_cooldown<=N` 这类比较表达式消费；裸 cooldown 数值表达式仍不进首期计分。
- 组合语义已支持：`amountFunc=add` 走线性累加，`amountFunc=mult` 走乘方法；拿不准的组合直接降级 warning。
- `applyManually=true` 的效果当前不计分，只保留 warning。

### 3.4 当前明确还没进代码的条件
- `front / behind / top / bottom / same column` 这类布局语义，先写进 planner model 设计，但不在缺少稳定布局方向定义时硬算。
- `male / female / race / alignment / role` 之外更复杂的布尔表达式，仍应通过结构化 parser 或语义补丁进入 qualifier，不能靠页面或评分代码现场猜。
- `HasEffect(...)` 这类运行时状态表达式当前不进入静态 planner model；缺少稳定事实源时只记 warning，不硬算。
- hero 私有 stack 体系，例如 `per_mithral_hall_stacks`、`per_aerois_synergy` 这类阵营/专属协同，当前不做猜测。
- 未稳定覆盖的 `stack_func` / `amount_func` 组合继续降级为 warning，暂不计分。

## 4. 推荐流水线
```text
scenario + layout
  -> 读取 resolved scenario model
  -> 选择或枚举 C 位
  -> 构建候选池
  -> 读取 resolved hero models
  -> 计算 hero-slot PlacementFit
  -> 运行完整阵型搜索
  -> 输出 Top K 完整阵型
  -> 从 Top K 派生槽位替补和 seat 竞争
```
- 手动模式：用户先锁定一个 C 位，系统只围绕它推荐。
- 自动模式：系统枚举所有 `isCarryViable` 的英雄并产出 `carryRanking`。
- 无论手动还是自动，完整阵型搜索时都必须有且仅有一个主 C 位。
- 引擎结构兼容 `owned-only / all-hypothetical / manual-override`，首期默认落地 `owned-only`。
- 同 seat 冲突属于硬约束，在搜索前就生效。
- 搜索单位是**完整阵型**，不是逐槽位贪心挑人。
- 继续采用 deterministic beam search。
- 目标从“把高权重英雄塞满队”改成“最大化当前 C 位输出代理值”。
- 逐槽位推荐只能从 Top K 或 near-optimal 合法阵型集合中派生。

## 5. 评分规则
- 主评分只看 `carryScore`：C 位基础伤害与自增伤、对 C 位生效的全队增伤、位置增伤、标签/阵营/职业/性别条件增伤，以及会反映到 C 位有效输出的敌方承伤/易伤类效果。
- 不计入主评分：非 C 位自身 DPS、整队总伤害、敌对单位血量、击杀判定、过关门槛，以及无法稳定解析的规则。
- `carryScore` 接近时，再比较：激活条件覆盖更完整、warning 更少、启发式依赖更少、结果更稳定且约束满足更干净。

## 6. 语义优先级
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

## 7. 输出合同
- 主结果为 `PlannerRecommendationSet`：`carryRanking`、`topLineups`、`slotAlternatives`、`seatCompetition`、`globalWarnings`。
- `topLineups` 的每项 `PlannerLineupCandidate` 至少包含：`carryHeroId`、`placements`、`carryScore`、`scoreBreakdown`、`reasonCodes`、`warnings`、`assumptions`、`fallbackSources`。
- `slotAlternatives` 与 `seatCompetition` 都必须来自完整阵型结果派生，不能单独再排一套榜。

## 8. 验收场景
- 相邻增益英雄与 C 位相邻时，完整阵型分数高于不相邻摆法。
- 同一类叠层效果在 `add` 与 `mult` 下，最终 multiplier 必须不同。
- `stat_score` / `stat` / `age` 这类限定会真正影响 carry 命中和 formation 计数结果。
- 顶部 / 身后 / 同列 / 前后范围规则会真正改变站位选择。
- 同 seat 双英雄竞争时，Top 1 只能保留一人，但另一人必须出现在 `seatCompetition` 或槽位替补里。
- 非 `输出` 标签但被标记为 `isCarryViable` 的英雄可以进入 C 位枚举。
- 仓库语义补丁和浏览器本地 override 都能改变推荐解释来源。
- unsupported 规则只进入 warning，不进入主评分。

## 9. 当前明确不做
- 敌对单位血量模型
- “是否能击杀当前敌人”的门槛判定
- 逐帧战斗模拟
- 多目标评分：速度、金币、生存、平衡混合分
- 视觉交互和页面样式设计
