# 上游 definitions 已确认格式特性

- 日期：2026-07-21
- 作用：记录官方 definitions 快照中已确认的格式怪癖，以及归一化层 / 消费层的适配方式。排查上游数据异常时先在此比对，区分「数据源格式特性」与「归一化 bug」。
- 配套原则：见根 `AGENTS.md` §1.3「数据源格式追溯」——上游格式异常必须先追溯 raw 源头，raw 证实前不得下「数据源 bug」结论。

## 处理原则

- 数据源格式特性优先在归一化层（`scripts/normalize-idle-champions-definitions.mjs`）适配，让消费层拿干净数据。
- 无法在归一化层处理的，才退到消费层防御。

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
