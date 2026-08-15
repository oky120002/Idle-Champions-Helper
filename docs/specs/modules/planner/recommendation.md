# 阵型推荐英雄与站位设计

推算引擎的纯算法与数据模型设计。评估与模型字段以 `src/domain/abilities/abilityModel.ts` 与 `src/domain/planner/placementFit.ts` 代码为准——pool 聚合 + carryDps，输出层字段 `objectiveValue`（carry-dps 模式 = carryDps，team-gold 模式 = teamGoldFind）。本文不展开视觉稿、交互稿或逐帧战斗模拟。

## 1. 核心结论
- 推荐目标不是整队总 DPS，而是**单一 C 位英雄的最终输出代理值**。
- 一个阵型必须先确定 C 位，再围绕这个 C 位选择 support、站位和激活条件。
- 非 C 位英雄的价值，只通过「是否提高当前 C 位输出」来计入目标值；其自身输出不进入主目标量。
- 后期推关语境下，默认关键技能都已解锁；不考虑技能等级门槛。
- 不同关卡 / 变体的阵型布局不同，推荐必须绑定具体 `scenario + formation layout`。
- 官方不会提供可靠的敌对单位血量模型；planner 也**不需要**考虑敌方血量，只堆高 C 位输出代理值。

## 2. 数据分层与 merge
- 推算引擎不直接读取零散的 `champion-details`、`variants`、`formations` 和原始 effect string 做现场聚合，而是统一消费 merge 后的 planner model。
- 官方归一化 hero ability model：由官方数据获取流水线新增一步「阵型推荐归一化」，产出到 `public/data/v1/hero-abilities.json` 与 `public/data/v1/scenarios.json`。
- `hero-abilities.json`：每个英雄的推荐专用画像，包含 `baseDamage` / `costCurves`、support 语义、位置条件、标签条件、增伤方向、unsupported 缺口、`gainProfile`（build 期预算的各维度收益，供计算模式排序裁剪候选）。
- `scenarios.json`：每个 scenario 的布局、非英雄占格、强制 / 白名单英雄、拓扑关系、目标区域、敌人类型和位置限制等推荐输入。
- 仓库语义补丁：`scripts/data/semantic-overrides.json`，补官方自动解析拿不到或不稳定的语义，例如顶部 / 底部、前后、同列、身后、职业 / 性别 / 阵营 / 角色条件、特殊激活条件。
- 浏览器本地 override：IndexedDB store `heroAbilityOverrides`，按英雄全局存储，只允许覆盖语义字段；不改原始官方英雄详情，不改公共静态产物，不进生产构建。
- 固定优先级：`官方 planner model < 仓库语义补丁 < 浏览器本地 override`。
- 推算引擎、模拟器和所有消费者只读 merge 后的 resolved model，不再分散拼接源数据。

## 3. 核心模型
- `ResolvedHeroAbilityProfile` 至少包含：`heroId`、`seat`、`roles`、`tags`、`age`、`abilityScores`、`baseDamage`、`costCurves`、`carrySignals`、`supportSignals`、`unsupportedSignals`、`sourceBreakdown`。其中 `targetQualifier`、`formationCountQualifier`、`positionQualifier`、`formationCountPositionQualifier` 位于每条 signal 上（单数），而非 hero 顶层。
- `HeroAbilitySignal` 可带 `bonusScaleOfSignal`：表示「当前 signal 是对另一条基础 signal 的效果增幅」，服务 `buff_upgrade*` 家族，避免把「增强某个升级效果」误算成独立新 buff。
- `carrySignals`：英雄自身提高自己输出的规则（仅 supportHero===carryHero 时计入）。
- `supportSignals`：该英雄如何提高别人输出，尤其是如何提高当前 C 位输出。
- `sourceBreakdown`：记录每条语义来自官方解析、仓库补丁还是本地 override。
- `ResolvedPlannerScenarioModel` 至少包含：`scenarioRef`、`formationLayoutId`、`objectiveArea`、`slotTopology`、`forcedHeroes`、`occupiedSlotCount`、`attributeRequirements`、`viabilityContext`、`damageSourcePattern`、`scenarioWarnings`。`damageSourcePattern` 的 `includeReference` 来自原文是否明确列出参考英雄自身，不能由几何关系擅自推断；`within-slots` 按 `slotTopology` 的最短路径求值。
- 不把 `objectiveArea` 用于敌方血量计算，只作为场景身份和布局上下文。
- `PoolAggregateResult` 表示「某 support 站在某槽位时，对当前 C 位的加成贡献」，至少包含：`heroId`、`slotId`、`carryHeroId`、`carrySlotId`、`pools`（按 `dimension:scope` 分池）、`totalMultiplier`、`scoreBreakdown`、`warnings`。

### 3.1 PoolAggregateResult 最小合同
- 推荐问题先拆成最小确定性单元：`evaluatePlacementFit(carryHero, carrySlot, supportHero, supportSlot, scenario)`。
- 这个函数只回答一件事：当前 support 站在当前槽位时，是否真正提高了当前 C 位；若提高，具体提高多少；若没提高，原因是什么。
- `totalMultiplier` 只表示这一个 support 对这一个 carry 的加成贡献（按 pool 聚合后），不负责整队搜索，不负责 UI 文案。
- effect 数值默认按百分比解释：`100 => +100% => x2.0`，`50 => +50% => x1.5`。
- 但 effect 的**组合方式**不能一刀切：同一类 signal 可能是加法叠层，也可能是乘法叠层；必须显式保留 `amountFunc + stackFunc`，不能只看 `value`。
- `scoreBreakdown` 的每一条都必须带 `signalKind`、`rawEffect`、`multiplier`、`active`、`reasonCode`、`source`。

### 3.2 判定顺序（evaluatePlacementFit 五道门控）
1. dimension 过滤：signal 维度是否属于本次评估请求的维度集合。
2. 等级解锁门控：`signal.requiredLevel <= supportLevel`，否则 `level-locked`。
3. 位置条件：`matchesPositionQualifier`（relation = self / adjacent / 列方向 / 图距离等），否则 `position-mismatch`。
4. 目标条件：`matchesHeroQualifier`（carry 是否符合 `targetQualifier`），否则 `tag-mismatch` / `stat-mismatch`。
5. multiplier 解析：`resolveSignalMultiplier`（amountFunc / stackFunc / bonusScaleOfSignal），无法稳定解析则 `unsupported-composition`。
6. 命中后按 signal 的组合语义计算 multiplier：普通百分比直接换算；formation 计数类再结合 `amountFunc + stackFunc` 求值。
7. 若 signal 带 `bonusScaleOfSignal`，则先求出基础 signal 的有效百分比，再把当前 signal 视为「对该百分比的增量」；不能把基础 signal 再完整重复计一遍。
8. 未命中只记录原因，不计入目标值；语义缺失、需要手动触发、或组合方式不稳定的规则，只进入 `warnings`。

### 3.3 已支持的条件
- `globalDpsMultiplier`：默认对 carry 生效（global 池，relation=any）。
- `heroDpsMultiplier`：默认只对 carry 自身生效（hero 池，relation=self）。
- carry 目标限定（`targetQualifier`）支持：tag（正向 / 排除）、stat 阈值（六维 + `total_ability_score` 派生求和）、attack damage type、base attack cooldown 阈值、age 上下界（保留原始比较方向）、hero_id 白名单 / 黑名单。
- 简单别名谓词：`is_undead` → tag `undead`；`has_tag_X` / `has_base_attack_dmg_type_X` 裸标识符别名。
- 布尔组合：`&&`（shorthand `^`）/ `||`（shorthand `|`）/ `!` NOT，解析到同一 `HeroPredicateAST`；`as_int(<静态谓词>)` 退化回内部谓词。
- formation 计数限定（`formationCountQualifier`）支持的 stackFunc 全集（`STACK_COUNT_RESOLVERS`，`stackCountResolver.ts`）：
  - **formation-count 类**（按整队英雄事实计数）：`per_crusader`、`per_hero`（前者同义词）、`per_tagged_crusader_mult`、`per_target_crusader`、`per_hero_attribute`、`per_upgrade_targets`。
  - **topology-count 类**（按阵型拓扑计数）：`per_col_behind`（carry 落后 support 的列数）、`per_slot_distance_from_source`（邻接图槽位距离）。
- 计数限定可按相对站位子集计数（`formationCountPositionQualifier.relation`，如「每个相邻英雄」「每个非相邻英雄」），不仅按整队。
- `excludeSelf` 排除 support 自身。
- 组合语义：`amountFunc=add` 走线性累加，`amountFunc=mult` 走乘方法；拿不准的组合直接降级 warning。
- `applyManually=true` 的效果不计入目标值，只保留 warning。

### 3.4 尚不支持的条件
进入 `unsupportedSignals` + `warnings`，不计入目标值（「宁可不准，不可错」）：

- `top` / `bottom`、跨行扇区、动态连锁等布局规则（缺稳定拓扑事实源）。
- `HasEffect(...)` 等运行时状态表达式（缺稳定事实源）。
- hero 私有 stack 体系（`per_mithral_hall_stacks` / `per_aerois_synergy` 等阵营专属协同）。
- `EligibleForPatron(arbitrary)`（需任意 patron 上下文）；`EligibleForPatron(current)` 已实现（当前 patron 上下文，见 `expression-evaluator.md`）。
- 数值 `per_hero_expr`（`min` / `max` / `floor` / `GetUpgradeAmount` / `levels_past_softcap` 等，用于 stack 数量计算）——stack 数当前靠 `STACK_COUNT_RESOLVERS` 查表，不解析数值表达式，详见 `expression-evaluator.md`。
- 未稳定覆盖的 `stack_func` / `amount_func` 组合。

### 3.5 位置关系
位置关系全集与求值见 `src/domain/planner/placementSlotRelation.ts` 的 `matchesSlotRelation`（基于官方 `slotTopology` 的 `column` / `adjacentSlotIds`，不靠页面启发式猜前后排）。按语义分三类：

- **列方向**：`sameColumn` / `adjacentColumns` / `aheadColumn` / `behindColumn` / `allAheadColumns` / `allBehindColumns` / `sameOrAheadColumns` / `sameOrBehindColumns` 及其两列宽带变体（`aheadTwoColumns` / `behindTwoColumns` / `selfAndAheadAndBehindColumns` 等）、`exactlyBehindNColumn`（exactly_x_behind）、绝对后排列（`rearMostColumn` / `secondRearMostColumn` / `thirdRearMostColumn`，col_num start_from_back）。
- **图距离**：`adjacent` / `adjacentOrSelf` / `nonAdjacent` / `withinTwoSlots` / `withinTwoSlotsOrSelf` / `withinThreeSlots` / `withinThreeSlotsOrSelf`（按 `adjacentSlotIds` 邻接图 BFS 最短路径，非几何 / row-column 近似）。
- **全阵型**：`any`（targets 为 `all` / `all_slots` 或 filter-like 对象），配合 `filter_targets` 保留 carry 命中限定（tag / stat / attack_type）。

典型语义覆盖：相邻、within 2/3 slots、同列、身前 / 身后列、最前后两列、倒数第 N 列（如 Tasslehoff「rear-most column」）。

### 3.6 hero_dps 家族的两层语义
`hero_dps_multiplier_mult` 家族常带「targets（受益 carry 的站位关系）+ effect 第三参数（formation 计数的站位子集）」两层语义：

- `hero_dps_mult_per_target_crusader`：targets 决定受益 carry 站位关系，effect 第三参数决定计数站位子集。
- `hero_dps_mult_per_tagged_crusader_mult`：按 tag 计数、对 carry 乘算增伤。
- `hero_dps_mult_per_crusader_mult`：按 carry 限定条件计数，只对同限定 carry 生效（已覆盖 attack_type 静态限定）。
- `hero_dps_mult_per_col_behind`：按 carry 相对 source hero 落后多少列乘算叠层。

### 3.7 buff_upgrade 派生 signal
`buff_upgrade*` 稳定支持「派生 signal over base signal」：若被增强的基础升级本身已可见于 planner，wrapper 会产出和基础 signal 同受益目标、同站位语义的派生 signal，并通过 `bonusScaleOfSignal` 把加法 / 乘法增量带入评估。装备源 buff_upgrade wrapper 由 `applyEquipmentBuffsToProfile` 按 target upgradeId 反查 direct base signal 注入（owned-aware，与 feat / 专精同层）。

`buff_upgrade_per_any_crusader_where_mult` / `buff_upgrade_mult_by_distance_from_source_mult` 等复杂变体只要 comparison 能归一化成静态 qualifier（属性 / 年龄 / cooldown 阈值）或邻接图距离，就进入评估；不可归一化的降级 warning。
