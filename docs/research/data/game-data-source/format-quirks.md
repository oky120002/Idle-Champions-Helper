# 上游 definitions 已确认格式特性

- 日期：2026-07-21
- 作用：记录官方 definitions 快照中已确认的格式怪癖，以及归一化层 / 消费层的适配方式。排查上游数据异常时先在此比对，区分「数据源格式特性」与「归一化 bug」。
- 配套原则：见根 `AGENTS.md` §1.3「数据源格式追溯」——上游格式异常必须先追溯 raw 源头，raw 证实前不得下「数据源 bug」结论。

## 处理原则

- 数据源格式特性优先在归一化层（`scripts/normalize-idle-champions-definitions.mjs`）适配，让消费层拿干净数据。
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
- 统一处理：`parseHeroPredicate(expr, dialect)`（`src/domain/abilities/heroPredicate.js`）解析到同一 `HeroPredicateAST`，由 `evalHeroPredicate` 求值。三处载体在 `normalizeTargetQualifier`（tags/hero_expr）与 `parsePerHeroExpr`（per_hero_expr）汇入同一 `HeroQualifier.predicate`。
- 数值表达式（`min` / `max` / `floor` / `GetUpgradeAmount` 等）不是布尔谓词，解析返回 `null`，交由 planner stage 7 stack 计算。
- 实现权威：解析器语法以 `src/domain/abilities/heroPredicate.js` 为准；别名谓词或新载体扩展时同步更新本节。

### `filter_targets[].type` 全量覆盖审计（第四轮·2026-07-21）

`effect_defines[].effect_keys[].filter_targets[].type` 全量分布（377 处）与处理状态：

- 已处理（`normalizeTargetQualifier` → `HeroQualifier.predicate`）：`by_tags` / `tags` / `hero_expr` / `stat` / `stat_score` / `attack_type`；`hero_ids` / `exclude_heroes`（本轮接入，复用 `heroId` AST 节点，与 `per_hero_expr` 的 `hero_id==N` 同节点）。
- 未处理（阵型聚合，归 `expression-evaluator-plan.md` formationAggregate / step simulation）：`has_neighbour_with_tag` / `by_neighbours` / `dominant_affiliation` / `not_dominant_alignment` / `non_dominant_gender` / `by_seat` / `by_release_date` / `is_season_champion` / `target_has_tag`。
- 未处理（存档依赖，归 conditionEvaluator）：`affected_by_upgrade`(27) / `not_affected_by_upgrade`(12)。
- 未处理（叠加上限，归 buff_upgrade 精细 / step simulation）：`limit_effect_def_per_hero_attack` / `limit_per_effect`。

未识别 type 经 `.filter(node => node !== null)` 静默丢弃（不进 unsupported、无统计）。新增 type 必须显式处理并登记本节。`hero_ids`/`exclude_heroes` 本轮已接入但当前对真实 carryDps 无输出变化：`hero_ids` 仅出现在 buff_upgrade wrapper（派生路径不处理 wrapper 自身 filter_targets，见下文）；`exclude_heroes` 的 base effect 多因 `targets:"other"` 未支持而进 unsupported。待上游瓶颈消除后自动生效。

### effect_def 级 effect_key 与 upgrade.effectReference

- `upgrade_defines.effect` 是裸 effect_string（如 `hero_dps_multiplier_mult,400`），不含 filter_targets/per_hero_expr 等修饰。仅 `effect_def,<id>` 格式（1418 处）经 `parseEffectDefinitionId` 关联 `effect_defines[<id>]`，其 `effect_keys[]`（含 filter_targets/per_hero_expr/amount_expr）经 normalize 保留到 `upgrade.effectDefinition.snapshots.original.effect_keys`。其余 ~90% upgrade 为纯 effect_string（简单 effect，本就无修饰字段，非丢失）。
- 部分 effect_def 无任何 upgrade/ability 引用（孤立，如 effect_def 134/163 的 `hero_dps_multiplier_mult,400` + `hero_ids`），不进 carryDps，非丢失。

### 未支持的 string target（`normalizeExplicitTargeting`）

`effect_defines.targets` 字符串简写，`STRING_RELATION_MAP` 未覆盖的高频值：`other`(56) / `self_slot`(24) / `area`(12) / `active_campaign`(7) / `edge` / `middle_columns` / `front_column` / `bud_setter` / `non_col` / `self_and_behind_and_ahead` 等。未支持者进 unsupportedSignals（保守安全，不静默当作已算）。`other` 语义 = 全队除 source（如 effect_def 214「提高所有其他勇士的生命值」），关联的 carryDps effect 仅 2-3 处（`hero_dps_multiplier_mult` 等），其余多为 health/触发类（M1/M2 不处理）；`other` 精确支持需 `positionQualifier` 增强 excludeSelf 语义，归未来。

### buff_upgrade wrapper 派生不处理 wrapper 自身 filter_targets

`collectEffectEntries` 派生 buff_upgrade signal 时，preset 继承 base 的 targetQualifier（base effect 的 normalizeTargetQualifier 结果），不调 `normalizeTargetQualifier(wrapper effect)`，wrapper 自身的 filter_targets（如 `hero_ids`）丢失。归阶段 8.5「bonusScale targeting 复用评估」扩展（wrapper 层 targeting 合并语义需评估）。
