# 上游 definitions 已确认格式特性

- 日期：2026-07-21
- 作用：记录官方 definitions 快照中已确认的格式怪癖，以及归一化层 / 消费层的适配方式。排查上游数据异常时先在此比对，区分「数据源格式特性」与「归一化 bug」。
- 配套原则：见根 `AGENTS.md` §1.3「数据源格式追溯」——上游格式异常必须先追溯 raw 源头，raw 证实前不得下「数据源 bug」结论。

## 处理原则

- 数据源格式特性优先在归一化层（`scripts/normalize-idle-champions-definitions.ts`）适配，让消费层拿干净数据。
- 无法在归一化层处理的，才退到消费层防御。
- 多态 `type` 字段（如 `filter_targets[].type` / `targets[].type`）：消费层只处理已知 type 子集时，未知 type 静默丢弃。新增 type 必须在消费层显式处理并登记到本文件「已确认特性」；审计时须对 raw（被引用子集）全量枚举 type 值，避免像 `hero_expr`（41 处在被引用 effect_keys）长期被吞。

## 已确认特性

### `upgrade_defines.effect`：CNE 序列化不稳定

- 现象：有时是合法 JSON 对象串，有时是 `effect_string` 行末缺逗号的伪 JSON，两种形态混存。
- 处理：归一化层 `normalizeEffectReference` 提取 `effect_string`，不依赖整串可解析。

### `effect_defines.targets.tags` / `per_hero_expr` / `filter_targets.hero_expr`：三处英雄布尔表达式载体

- 三处字段都是英雄布尔表达式，用两种方言：
  - `targets.tags`（shorthand）：运算符 `|` / `^` / `!` / `()`。
  - `per_hero_expr` 与 `filter_targets[].hero_expr`（functional）：运算符 / 函数 `||` / `&&` / `HasTag` / `GetStat` / `age` / `hero_id` / `HasAttackDamageType` / `has_base_attack_dmg_type_*` / `has_tag_*`。
- `filter_targets` 的 `type:"hero_expr"` 与 `per_hero_expr` 同方言、同求值域（单个英雄），语义是「限定 effect 的目标英雄」（如 Diana `GetStat(\`dex\`)>=15`、Sheila `HasTag(\`good\`)`、Baldric `HasTag(\`dwarf\`)`）；真实数据 41 处（被引用 effect_keys）。
- 统一处理：`parseHeroPredicate(expr, dialect)`（`src/domain/abilities/heroPredicate.ts`）解析到同一 `HeroPredicateAST`，由 `evalHeroPredicate` 求值。三处载体在 `normalizeTargetQualifier`（tags/hero_expr）与 `parsePerHeroExpr`（per_hero_expr）汇入同一 `HeroQualifier.predicate`。
- 数值表达式（`min` / `max` / `floor` / `GetUpgradeAmount` 等）不是布尔谓词，解析返回 `null`，交由 planner stage 7 stack 计算。
- 实现权威：解析器语法以 `src/domain/abilities/heroPredicate.ts` 为准；别名谓词或新载体扩展时同步更新本节。

### `filter_targets[].type` 全量覆盖审计（第四轮·2026-07-21）

`effect_defines[].effect_keys[].filter_targets[].type` 全量分布（377 处）与处理状态：

- 已处理（`normalizeTargetQualifier` → `HeroQualifier.predicate`）：`by_tags` / `tags` / `hero_expr` / `stat` / `stat_score` / `attack_type`；`hero_ids` / `exclude_heroes`（本轮接入，复用 `heroId` AST 节点，与 `per_hero_expr` 的 `hero_id==N` 同节点）。
- 未处理（阵型聚合，归 `expression-evaluator-plan.md` formationAggregate / step simulation）：`has_neighbour_with_tag` / `by_neighbours` / `dominant_affiliation` / `not_dominant_alignment` / `non_dominant_gender` / `by_seat` / `by_release_date` / `is_season_champion` / `target_has_tag`。
- 未处理（存档依赖，归 conditionEvaluator）：`affected_by_upgrade`(27) / `not_affected_by_upgrade`(12)。
- 未处理（叠加上限，归 buff_upgrade 精细 / step simulation）：`limit_effect_def_per_hero_attack` / `limit_per_effect`。

未识别 type 经 `.filter(node => node !== null)` 静默丢弃（不进 unsupported、无统计）。新增 type 必须显式处理并登记本节。`hero_ids`/`exclude_heroes` 已接入：`hero_ids` 在 buff_upgrade wrapper 派生路径合并生效（`collectEffectEntries` 派生时 AND 合并 wrapper 自身 filter_targets，见下文）；`exclude_heroes` 的 base effect 多因 `targets:"other"` 未支持而进 unsupported，待 `positionQualifier` excludeSelf 增强后生效。

### `target_filters_or`：数组内 OR 语义（待游戏源码确认·第六轮审计）

- `getRawFilters` 收集 `filter_targets` / `target_filters` / `target_filters_or` / `targets`(filter-like) 四个数组，`normalizeTargetQualifier` 统一按 **AND** 合并所有 filter。
- 疑点：`target_filters_or` 字段名后缀 `_or` 暗示数组内 filter 间是 **OR**（任一匹配），区别于 `target_filters`（AND，全部匹配）。佐证：effect_def 1390（Solaak）同英雄同 effect 一处用 `target_filters_or`、一处用 `target_filters`，同为 `attack_type:ranged` 单 filter（单 filter 下 OR=AND，不构成判别）；真正能判别的多 filter 样本仅 effect_def 225（`hero_dps_mult_per_target_crusader_mult,100,all_slots` + `target_filters_or:[{str>=16},{tags:evil}]`，孤立无 upgrade 引用）。
- 当前影响：零——已引用 effect_keys 中 `target_filters_or` 全为单 filter（hero 118/120/171），AND=OR；唯一多 filter 样本（225）孤立。故现状保守保留 AND 合并（AND 比 OR 更严格 → 低估，安全方向）。
- 待办：拿到 IC 源码或社区文档确认 `target_filters_or` 语义后，若确为 OR，在 `normalizeTargetQualifier` 中将 `target_filters_or` 单独按 OR 聚合，再与其它 AND 组合并。确认前不改（避免 OR→高估风险）。

### effect_def 级 effect_key 与 upgrade.effectReference

- `upgrade_defines.effect` 是裸 effect_string（如 `hero_dps_multiplier_mult,400`），不含 filter_targets/per_hero_expr 等修饰。仅 `effect_def,<id>` 格式（1418 处）经 `parseEffectDefinitionId` 关联 `effect_defines[<id>]`，其 `effect_keys[]`（含 filter_targets/per_hero_expr/amount_expr）经 normalize 保留到 `upgrade.effectDefinition.snapshots.original.effect_keys`。其余 ~90% upgrade 为纯 effect_string（简单 effect，本就无修饰字段，非丢失）。
- 部分 effect_def 无任何 upgrade/ability 引用（孤立，如 effect_def 134/163 的 `hero_dps_multiplier_mult,400` + `hero_ids`），不进 carryDps，非丢失。

### 未支持的 string target（`normalizeExplicitTargeting`）

`effect_defines.targets` 字符串简写，`STRING_RELATION_MAP` 未覆盖的高频值：`other`(56) / `self_slot`(24) / `area`(12) / `active_campaign`(7 effect_defines + 54 legendary) / `edge` / `middle_columns` / `front_column` / `bud_setter` / `non_col` / `self_and_behind_and_ahead` 等。未支持者进 unsupportedSignals（保守安全，不静默当作已算）。`other` 语义 = 全队除 source（如 effect_def 214「提高所有其他勇士的生命值」），关联的 carryDps effect 仅 2-3 处（`hero_dps_multiplier_mult` 等），其余多为 health/触发类（M1/M2 不处理）；`other` 精确支持需 `positionQualifier` 增强 excludeSelf 语义，归未来。`active_campaign` 语义 = 当前活跃 campaign 场景条件（steady-state 默认满足），位置上 = 全队；legendary 54 处全是 `global_dps_multiplier_mult`（该分支不检查 targets，未被阻塞），effect_defines 7 处中仅 1 个 `hero_dps_multiplier_mult` 被阻塞。

`all` / `all_slots` 在 `normalizeExplicitTargeting` 中映射为 `relation:'any'`（全阵位，status=supported）。第六轮审计发现 `resolveCountRelation` 曾因 `relation==='any'` 返回 null，导致 `hero_dps_mult_per_target_crusader*` 的 `all_slots` 计数目标（effect_def 225/394/442/594 等）在解析阶段被静默丢弃，到不了消费层 `countQualifiedHeroes`（后者已显式支持 `'any'`：跳过 `matchesSlotRelation`，只按 `formationCountQualifier` 计数全阵位匹配英雄）。已修复：`resolveCountRelation` 放行 `'any'`。当前零行为影响（上述 all_slots per_target_crusader 均为孤立 effect_def，无 upgrade 引用；被引用的 all_slots effect_def 505/509/519/527 是 Krull `hero_dps_mult_reduced_by_tag` / Artemis `observance` / Dragonbait `scent_*` 等其它 unsupported kind），修复消除潜在静默丢弃陷阱。

### buff_upgrade wrapper 派生：真升级叠加 vs sentinel 产物去重

`collectEffectEntries` 派生 buff_upgrade signal 时：

- preset 继承 base 的 targetQualifier，并 AND 合并 `normalizeTargetQualifier(wrapper effect)`（经 `mergeHeroQualifiers`），避免 wrapper 层 filter_targets（如 `hero_ids` 白名单）丢失。真实样本：hero 82 的 `buff_upgrades` + `hero_ids:[82]`。
- **去重按 `required_level` 区分**（第七轮审计·2026-07-24 修正）：
  - 真升级（`required_level<9999`）：各自可购的永久升级，对同一 base 的多条**全部叠加**（如 Bruenor Rally 15 条 magnitude 100~300 分布在 level 150~3130）。去重 key 追加 `upgradeId`，同/异 magnitude 多条均各自保留。原「同 group 取最高 magnitude」是 bug——把 299 个真升级组的叠加链折叠成单条，严重低估。
  - sentinel 产物（`required_level>=9999`）：CNE 把非可购逻辑 buff 展开成完全相同副本（如 Jaheira 38 条 `buff_upgrades,100,...`），只生效一次，按 `rarityGroupKey`（kind/amountFunc/stackFunc/base targeting，排除 magnitude）去重，同组不同 magnitude 取最高（保守，全库仅 3 组）。
- 消费侧 `evaluatePlacementFit` 的 pool `addPercent` 累加同 pool 信号，修正后真升级 buff 正确叠加（base + Σ(basePercent × mag_i)/100）。
