# planner signal 覆盖率盘点

- 作用：基于真实 `public/data/v1/champion-details/*.json` 统计 planner 已识别 signal、叠层组合、filter 与 `per_hero_expr` 的覆盖情况。
- 命令：`npm run data:signal-coverage`
- 数据快照日期：`2026-07-21`

## 核心结论

- 当前共有 `164` 个英雄详情，扫描到 `29316` 条 effect entry。
- 其中 `12253` 条已被 planner 识别成可消费 signal（buff_upgrade 完全重复去重后；去重前 15409），`4138` 条属 unsupported（多为金币/治疗/crit/ultimate 等 effect，非 bug）。
- per_hero_expr：`291` 条，已解析 `219`（`75.3%`），未解析 `72`（几乎全为数值表达式，见 `expression-evaluator.md`，或 `HasEffect`/`GetUpgradeUnlocked` 等运行时状态）。
- filter 限定：`hero_expr` filter（functional 谓词，第三种英雄谓词载体，见 `format-quirks.md`）已接入 `normalizeTargetQualifier`，目标英雄限定不丢失。
- signal 来源：`upgrade` 14266 / `upgrade-buffed-signal` 4919（buff_upgrade 派生）/ `loot` 4044 / `feat` 2554 / `upgrade-effect-key` 2549 / `legendary` 984。

## 统计口径

- **feat 已纳入**：`collectRawEffectEntries` 遍历 `detail.feats`（sourceBucket='feat'，与 loot/legendary 对称）。feat 是英雄专属固定能力，含 568 个 supported DPS signal，进理论最大基线。
- **buff_upgrade 完全重复去重**：IC 装备系统把同一 buff 按装备槽/稀有度展开成多条 effect 完全相同的 upgrade（仅 id 不同，magnitude 相同），每条各派生 base signal 会巨量累加（Jaheira 38 条同 wrapper 派生 152 重复，91% 过度计算）。`derivedSignalKey` 对完全相同 derived signal 去重。不同 magnitude 的稀有度取最高归 `buff-upgrade-priority.md` 的稀有度去重路径。
- **`getRawFilters` 单一来源**：`signalSemantics.ts`（生产，读 4 源）与 `signal-coverage.ts`（报告，只读 2 源）曾各有一份且漂移；已统一为 `signalSemantics.ts` 单一来源，报告复用，避免少统计 `target_filters_or`/`targets`。

## 当前高频组合

- `none__none`: `13709`
- `per_crusader__add`: `380`
- `per_hero_attribute__mult`: `133`
- `per_tagged_crusader_mult__mult`: `32`
- `per_crusader__mult`: `29`
- `per_upgrade_targets__mult`: `10`

已支持的高价值组合覆盖了绝大多数可识别 signal。继续补 `per_other_stack_count`、`per_mithral_hall_stacks`、`per_aerois_synergy` 这类低频私有 stack 收益很低。

## qualifier / filter 现状

- target qualifier（`hero_expr` 接入后）：tag `797` / stat `426`。
- formation count qualifier：tag `269` / stat `149` / age `12`。

高频 filter：

- `by_tags:female`: `49`、`by_tags:male`: `40`、`tags:male`: `34`、`by_tags:human`: `32`
- `stat_score:cha>=11`: `24`、`stat_score:con>=11`: `18`
- `attack_type` filter `73` 处（走 `type:attack_type` 通用描述，非 bug）。

tag / stat qualifier 这条线已覆盖大部分高频场景；`hero_expr` 接入后 stat/tag 限定不丢失。年龄限定真实数据里很少，不做重体系。

## per_hero_expr 现状

总量 `291`，可解析 `219`（`75.3%`），未解析 `72`。

未解析几乎全为：

- 数值表达式（`min` / `max` / `floor` / `GetUpgradeAmount` / `levels_past_softcap` / `AverageILevels` / `NumEquipmentWithMinimumRarity` 等）——属数值表达式求值器范围（`expression-evaluator.md`），当前 `parseHeroPredicate` 有意返回 `null`。
- 运行时状态（`!HasEffect(...)` / `HasEffectByID(...)` / `GetUpgradeUnlocked(...)` / `GetUpgradePurchased(...)` / `GetFeatEquipped(...)`）——依赖存档/阵型/装备上下文，保持 warning 不做静态猜测。
- 裸 stat 名（`cha` / `dex` / `int`）——数值非布尔，归数值求值器。

parser 对布尔谓词的覆盖已接近饱和；剩余未解析根因是「数值表达式没有统一求值器」（`expression-evaluator.md`）。

## 未来扩展

- 数值求值器（`expression-evaluator.md`）：`parseNumericExpr` + `evalNumericExpr`，接入 stack 数量计算，让当前降级 warning 的数值表达式升级为精确求值。
- 保持 `EligibleForPatron(...)` / `!HasEffect(...)` 等运行时状态表达式为 warning，不做静态猜测。
- 保持裸 `base_attack_cooldown`、私有 stack、动态公式为 warning，不做猜测。
