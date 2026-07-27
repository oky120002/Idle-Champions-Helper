# 表达式求值器

IC 的 `per_hero_expr` 字段承载两类语义，求值域不同，分别处理：

| 类别 | 语法 | 返回 | 求值域 | 现状 |
|------|------|------|--------|------|
| 布尔谓词 | `\|\|`/`&&`/`HasTag`/`GetStat` 比较/`age`/`hero_id`/`HasAttackDamageType` | boolean | 单个英雄 | ✅ 已统一到 `parseHeroPredicate('functional')` + `evalHeroPredicate` |
| 数值表达式 | `min`/`max`/`floor`/`as_int`/`GetUpgradeAmount`/`levels_past_softcap`/`get_num_most_common_*` | number | 英雄 + 存档 + 阵型 + 游戏常量 | ❌ `parseHeroPredicate` 返回 null 丢弃；stack 数量靠 `STACK_COUNT_RESOLVERS` 查表，18 条数值 per_hero_expr 未精确求值 |

数值表达式用于 **stack 数量计算**（如 `min(floor(levels_past_softcap/num_levels_per_stack), floor(highest_available_area/num_areas_per_stack))` = 这英雄算几层）。当前这些 signal 的 stack 数量没有精确算，降级为 warning。

## 布尔谓词（已实现）

`src/domain/abilities/heroPredicate.ts`：一个 parser 解析到 AST，一个 evaluator 求值；解析一次可缓存，多对象求值复用 AST。覆盖 `||`/`&&`/`HasTag`/`GetStat` 比较/`age`/`hero_id`/`HasAttackDamageType` 等布尔语法。

`parseHeroPredicate` 对数值表达式与运行时状态表达式统一返回 `null`——当前与「解析失败」不可区分，覆盖率统计因此把"故意不处理"和"应处理但漏了"混算未解析。

## 数值表达式散落点

数值表达式当前散落在多处，未统一求值：

- `parseHeroPredicate`（`heroPredicate.ts`）：数值 per_hero_expr 返回 null。
- `scripts/data/official-rule-helpers.ts`：`TimeAvailable(\`days\`) > N*365` 单独正则（patron 时间规则）。
- `src/domain/planner/placementFit.ts` 的 `STACK_COUNT_RESOLVERS`：stack 数量按 stackFunc 查表（`per_crusader` 数英雄 / `per_col_behind` 数列），不解析数值 per_hero_expr。
- `src/domain/effects/effect-string.ts` 的 `resolveSimpleAmountExpr`：只匹配单一 `upgrade_amount(N,i)`；20 条复合 amount_expr（`upgrade_amount(N,0)+...` 纯求和 5 条、`max_upgrade_amount`/`mult_stack`/`feat_amount`/`upgrade_amount(N,dps_update)` 15 条）回退得 effect value=0（低估）。`upgrade_amount` 与 `GetUpgradeAmount` 同类。

## 数值求值器设计方向（未来扩展）

与布尔谓词同构：**一个 parser 解析到 AST，一个 evaluator 求值；解析一次可缓存，多对象求值复用 AST**。禁止数值表达式散落到 official-rule-helpers / placementFit / normalize 各自正则。

设计骨架（`src/domain/abilities/numericExpression.js` + `.d.ts`，与 heroPredicate 同目录、同形态）：

- `NumericExprAST` 节点：数值函数（`min`/`max`/`floor`）、转换（`as_int` bool→int）、算术（`add`/`mul`/`div`）、`literal`、`heroStat`（`hero_level`/`levels_past_softcap`/`hero_softcap`/`max_levels_past_soft_cap`/`GetStat`）、`upgradeLookup`（`GetUpgradeAmount(id,slot)`/`GetUpgradeUnlocked(id)`）、`gameConst`（`num_levels_per_stack`/`num_areas_per_stack`/`highest_available_area`）、`heroDerived`（`has_tag_*`/`has_non_standard_race`/`is_most_common_race`）、`formationAggregate`（`get_num_most_common_*`）、`timeAvailable`。
- `parseNumericExpr(expr, dialect)` → `NumericExprAST | null`。
- `evalNumericExpr(ast, context)` → `number | null`，`context = { hero, formation, profile, gameDefinitions }`（比布尔谓词的 `hero` 大，因为依赖存档 + 阵型聚合）。
- 求值失败（节点不认识 / context 缺字段）→ 返回 `null`，调用方降级 warning（保守，不静默当作已算）。

接入点：

- `placementFit.ts` 的 stack 数量计算：signal 的 per_hero_expr 是数值表达式时，用 `evalNumericExpr` 精确算 stack 数量，替代/补充 `STACK_COUNT_RESOLVERS` 查表。
- `official-rule-helpers.ts` 的 TimeAvailable 正则：迁入 numericExpression，统一时间比较。
- `effect-string.ts` 的 `resolveSimpleAmountExpr`：扩展支持复合 amount_expr（先做 5 条纯 `upgrade_amount` 求和，`upgradeLookup` 节点复用；`max_upgrade_amount`/命名 index 等 15 条随 formationAggregate/context 节点一起）。

实现时须显式区分 `parseHeroPredicate` 的「数值表达式（移交数值 parser）」与「真不认识」——让覆盖率统计与下游 warning 能区分口径。

### 范围边界与复杂度

- `get_num_most_common_*` / `has_tag_*` / `is_most_common_race` 是**阵型聚合查询**（依赖整个 formation 的英雄构成），不是简单数值；求值要先算聚合（formation context），再代入数值表达式。复杂度最高，分步实现（先纯英雄/存档/常量节点，再阵型聚合）。
- **filter_targets 的阵型聚合 type**：`has_neighbour_with_tag` / `by_neighbours` / `dominant_affiliation` / `not_dominant_alignment` / `non_dominant_gender` / `by_seat` / `by_release_date` / `is_season_champion` / `target_has_tag` 共 ~13 处（raw effect_defines），当前 `normalizeTargetQualifier` 静默丢弃；求值依赖 formation context（邻居 / 主导 tag·affiliation·alignment·gender / seat / 发布日期等阵型聚合）。
- **filter_targets 的存档依赖 type**：`affected_by_upgrade`(27) / `not_affected_by_upgrade`(12) 共 39 处，effect 只在玩家拥有 / 未拥有某 upgrade 时生效；与 `GetUpgradeUnlocked` 同类（检查 owned upgrades）。无 profile 时降级——未拥有英雄用同 seat 中位假设（见 `simulator.md`）。
- 数值表达式 per_hero_expr 的 dialect 与布尔谓词共享 functional 语法基础（`||`/`&&` 嵌套场景），但顶层是数值函数；parser 区分「数值顶层」vs「布尔顶层」（布尔由 parseHeroPredicate 处理，数值由 parseNumericExpr 处理，二者互斥）。

## requirements / condition / effect_string args 审计

这三个字段「长得像谓词」，但求值域与英雄布尔谓词不同，**不强求合一**。

### requirements（用户存档解锁条件）

- 结构：`LocalizedText[]`（显示文本）+ patron 条件（`condition: complete_area` / `patron_perks_purchased` / `patron_total_influence`）。
- 求值域：用户存档（是否完成 area、购买 perk、积累 influence）。
- 现状：`official-rule-helpers.ts` 各 condition 类型单独逻辑（`extractPurchasedPerkRequirementCount` 等）。
- 结论：不强制。若 patron/variant 解锁条件类型扩散到 >5 种，再抽 `conditionEvaluator` 接口（`evalRequirement(requirement, profile) → boolean`，每类型一个 evaluator）。

### condition

与 requirements 同域（用户存档），`normalize` 阶段处理 `complete_area`/`area`，`official-rule-helpers` 处理 patron 条件。不强制合一。

### effect_string args（位置参数）

`parseEffectPayload`（`src/domain/effects/effect-string.ts`）把 effect_string 解析为 `{ kind, args[] }`，args 是位置约定（第 0 位 effect_def id、第 1 位 target id、第 2 位 tag 等）。**已抽象**，不需进一步统一——args 是位置约定，不是表达式语法，与布尔/数值表达式不同类。
