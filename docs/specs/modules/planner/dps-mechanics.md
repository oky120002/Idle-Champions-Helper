# DPS 机制注册表

planner 评分层消费的 DPS 机制清单。每个机制一个 `id`，三处一致使用同一 id：

- **代码**：`src/domain/planner/placementFit.ts` 的 `resolveSignalMultiplier` / `STACK_COUNT_RESOLVERS` / pool 聚合分支注释标 `// 机制: <id>`
- **英雄参照**：`src/domain/planner/references/*ReferenceData.ts` 的 ability `mechanicIds`
- **本文档**：下表注册表

新增机制走 `runbooks/add-champion-reference.md`；抽象阈值见 `dps-mechanic-abstraction.md`。

> 下表「代码处理点」列用 `// 机制: <id>` 注释锚定位（由 `championReferenceVerification.test.ts` 守护），不写行号——行号随代码编辑漂移，注释锚稳定。

## 注册表

| id | 中文名 | 识别字段 | 代码处理点 | 使用英雄（样例） |
|----|--------|----------|------------|------------------|
| `formation-count-mult-stack` | 整队计数乘算堆叠 | `stackFunc ∈ {per_crusader, per_hero, per_tagged_crusader_mult, per_target_crusader, per_hero_attribute}` + `amountFunc: mult` | `STACK_COUNT_RESOLVERS` + mult 分支（`// 机制: formation-count-mult-stack`） | 蔚「善良榜样」、多数阵营计数 buff |
| `formation-count-add-stack` | 整队计数线性堆叠 | 同上 + `amountFunc: add` | `STACK_COUNT_RESOLVERS` + add 分支（`// 机制: formation-count-add-stack`） | Bruenor 等 per_crusader add |
| `dynamic-stack-multiply` | 动态层数乘算堆叠 | `stacksMultiply: true`（+ 无 stackFunc） | `resolveSignalMultiplier` stacksMultiply 短路 + pool multFactor（`// 机制: dynamic-stack-multiply`） | 蔚「出言不逊永不够」 |
| `topology-count-stack` | 拓扑计数堆叠 | `stackFunc ∈ {per_col_behind, per_slot_distance_from_source}` | `STACK_COUNT_RESOLVERS`（`// 机制: topology-count-stack`） | 列/槽位距离类 support |
| `bonus-scale-linkage` | 技能联动（A 系数来源于 B） | `bonusScaleOfSignal` 非空 | `applySignalPercent` / stacksMultiply 依赖检查（`// 机制: bonus-scale-linkage`） | 蔚「出言不逊」挂「善良榜样」 |
| `buff-upgrade-modifier` | 装备/专长/feat 修饰 | 外部源（loot/feat/legendary）或 `stacks_multiply` 或复杂 wrapper 的 `buff_upgrade`/`buff_upgrades` | `applySignalPercent` 按基础 `value`（per-stack 百分比）折算，非聚合倍率；依赖基础 multiplier>1（叠层 0 层不生效）（`// 机制: buff-upgrade-modifier`） | 蔚「时髦披肩」（loot 装备） |
| `static-dps-mult-fallback` | 静态 DPS 乘数兜底 | upgrade 无可解析 signal + 有 `static_dps_mult` | `collectRawEffectEntries` fallback（`// 机制: static-dps-mult-fallback`） | 复杂机制 upgrade 兜底 |

## ability 源静态 buff_upgrade 排除（归一化期）

IC 的 effect_def `effect_string` 是满级 snapshot 计算值，已含该 ability 自身 upgrade 树的全部静态 `buff_upgrade` 贡献（ranked effectReference 进阶节点 + 同源 effect_keys 静态修饰，如蔚 20 条 `buff_upgrade,100,12312` + 劝人向善 `buff_upgrade,200,12312`）。证据：蔚善良榜样 `effect_string=300`，游戏显示 per-stack 恰好 +300%（4^7=16384），叠层系数 2.92e7 只含 2 个外部修饰器。

`collectEffectEntries`（`scripts/data/effect-helpers.ts`）派生循环跳过 **ability 源（`sourceBucket ∈ {upgrade, upgrade-effect-key}`）+ plain kind（`buff_upgrade`/`buff_upgrades`）+ 非 `stacks_multiply`** 的 buff_upgrade，否则每条叠 `base.value×X/100` 进 addPercent 会产生 22× 级 pool 高估（影响 162/164 英雄）。保留三类运行时修饰：

- `stacks_multiply` 动态（area 依赖，如蔚出言不逊）
- 复杂 wrapper（`buff_upgrade_per_tagged_crusader_mult` / `buff_upgrade_mult_by_distance_*` 等，阵型依赖）
- 外部源 loot/feat/legendary（装备/专长/feat 运行时修饰，不在 ability snapshot 内）

`use_computed_amount_for_description` 字段非可靠判据（仅 ~20% effect_def 有此 flag，且与 snapshot 语义不相关）；判断依据是「CNE export 的 effect_string 普遍为满级值」（蔚善良榜样实证）。全库 ability 源静态 buff_upgrade 共 4727 条被排除。

## 计数限定来源（formation-count-* 机制）

整队计数读 `formationCountQualifier`，来源优先级（`signalSemantics.ts:attachSignalSemantics`）：

1. `per_hero_expr`（functional 布尔谓词，如 `GetStat('dex')>=15`）
2. `stack_func_data.tag`（count 限定，多 tag `a|b|c` → OR；与 `filter_targets` 的 target 限定语义不同）
3. `filter_targets` 等 filter-like 结构（向后兼容：无 stack_func_data 时作 count 限定）

buff 目标读 `targetQualifier`（来自 `filter_targets`）。count 与 target 不可混用。

## 动态层数假设（dynamic-stack-multiply）

`stacksMultiply=true` 的 signal 层数来自数值表达式（`stacks_max_stack_expr` 等，当前 unsupported），由 `manualStackCount` 提供假设值：

- 默认 `DEFAULT_MANUAL_STACK_COUNT = 1000`（`placementFit.ts`）
- UI（评估页/计划页「动态层数假设」输入）透传 `ScoringInput.manualStackCount` → `evaluatePlacementFit`
- 校准口径见 `champion-reference-verification.md`
