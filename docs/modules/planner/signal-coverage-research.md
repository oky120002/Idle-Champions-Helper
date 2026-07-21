# planner signal 覆盖率盘点

- 作用：基于真实 `public/data/v1/champion-details/*.json` 统计 planner 当前已识别 signal、叠层组合、filter 与 `per_hero_expr` 的覆盖情况，用来决定下一刀该补什么。
- 命令：`npm run data:planner-coverage`
- 结论日期：`2026-07-21`

## 核心结论

- 当前共有 `164` 个英雄详情，扫描到 `29316` 条 effect entry。
- 其中 `12253` 条已被 planner 识别成可消费 signal（buff_upgrade 完全重复去重后；去重前 15409），`4138` 条属 unsupported（多为 M2 规划的金币/治疗/crit/ultimate 等 effect，非 bug）。
- per_hero_expr：`291` 条，已解析 `219`（`75.3%`），未解析 `72`（几乎全为数值表达式属 M2 数值求值器规划，或 `HasEffect`/`GetUpgradeUnlocked` 等运行时状态）。
- filter 限定：`hero_expr` filter（functional 谓词，第三种英雄谓词载体，见 `format-quirks.md`）已接入 `normalizeTargetQualifier`，目标英雄限定不再丢失。
- signal 来源：`upgrade` 14266 / `upgrade-buffed-signal` 4919（buff_upgrade 派生）/ `loot` 4044 / `feat` 2554 / `upgrade-effect-key` 2549 / `legendary` 984。

## 上一轮修复（2026-07-21）

- `filter_targets type:"hero_expr"` 此前被 `isFilterLikeTarget`/`normalizeTargetQualifier` 漏处理而静默丢弃：`hero_dps_multiplier_mult` 等 supported 效果的目标限定失效 → buff 误用到全部英雄。修复后 `signalsWithStatTargetQualifier` 340→426、`signalsWithTagTargetQualifier` 749→797（Diana/Sheila/Baldric 等英雄的 DEX/tag/race 限定恢复）。
- `getRawFilters` 此前在 `signalSemantics.js`（生产，读 4 源）与 `signal-coverage.mjs`（报告，只读 2 源）各有一份且已漂移，覆盖率少统计 `target_filters_or`/`targets` 来源。已统一为 `signalSemantics.js` 单一来源，报告复用。
- `collectRawEffectEntries` 此前漏遍历 `detail.feats`：feat（英雄专属固定能力，含 568 个 supported DPS signal）整体漏算，而同类的 loot/legendary 已进流。已加 feat 遍历（sourceBucket='feat'，与 loot/legendary 对称），recognized signals 14376→15409（+1033）。阶段 13「feat 精细乘数」指按玩家实际选择精算，不影响此处「全 feat 进理论最大基线」。
- `collectEffectEntries` 此前对 buff_upgrade wrapper 派生不去重：IC 装备系统把同一 buff 按装备槽/稀有度展开成多条 effect 完全相同的 upgrade（仅 id 不同，magnitude 相同=非稀有度差异），每条各派生 base signal → 巨量完全相同 signal 累加（Jaheira 38 条同 wrapper 派生 152 重复，91% 过度计算）。已加 `derivedSignalKey` 对完全相同 derived signal 去重（recognized 15409→12253，-20%）。剩余「不同 magnitude 稀有度取最高」归阶段 8。

## 当前高频组合

- `none__none`: `13709`
- `per_crusader__add`: `380`
- `per_hero_attribute__mult`: `133`
- `per_tagged_crusader_mult__mult`: `32`
- `per_crusader__mult`: `29`
- `per_upgrade_targets__mult`: `10`

结论：

- 已支持的高价值组合已经覆盖了绝大多数可识别 signal。
- 继续补 `per_other_stack_count`、`per_mithral_hall_stacks`、`per_aerois_synergy` 这类低频私有 stack，当前收益很低。

## qualifier / filter 现状

- target qualifier（`hero_expr` 修复后）：tag `797` / stat `426`。
- formation count qualifier：tag `269` / stat `149` / age `12`。

高频 filter：

- `by_tags:female`: `49`、`by_tags:male`: `40`、`tags:male`: `34`、`by_tags:human`: `32`
- `stat_score:cha>=11`: `24`、`stat_score:con>=11`: `18`
- `attack_type` filter `73` 处（仍走 `type:attack_type` 通用描述，非 bug）。

结论：

- tag / stat qualifier 这条线值得，已覆盖大部分高频场景；`hero_expr` 接入后 stat/tag 限定不再丢失。
- 年龄限定真实数据里很少，不值得做成重体系。

## per_hero_expr 现状

- 总量：`291`，可解析：`219`（`75.3%`），未解析：`72`。

未解析几乎全为：

- 数值表达式（`min` / `max` / `floor` / `GetUpgradeAmount` / `levels_past_softcap` / `AverageILevels` / `NumEquipmentWithMinimumRarity` 等）——属 M2 数值求值器规划（`expression-evaluator-plan.md`），当前 `parseHeroPredicate` 有意返回 `null`。
- 运行时状态（`!HasEffect(...)` / `HasEffectByID(...)` / `GetUpgradeUnlocked(...)` / `GetUpgradePurchased(...)` / `GetFeatEquipped(...)`）——依赖存档/阵型/装备上下文，保持 warning 不做静态猜测。
- 裸 stat 名（`cha` / `dex` / `int`）——数值非布尔，归 M2。

结论：

- parser 对布尔谓词的覆盖已接近饱和；剩余未解析的根因是「数值表达式没有统一求值器」，这正是 M2 第一刀（`expression-evaluator-plan.md`）。
- `parseHeroPredicate` 对数值/运行时表达式统一返回 `null`，与「解析失败」不可区分——`null` 语义双重，后续接入数值求值器时建议显式区分「不属于本 parser」vs「解析失败」。

## 下一刀建议

1. M2 第一刀做数值求值器（`expression-evaluator-plan.md`）：`parseNumericExpr` + `evalNumericExpr`，接入 stack 数量计算，让当前降级 warning 的数值表达式升级为精确求值。
2. 保持 `EligibleForPatron(...)` / `!HasEffect(...)` 等运行时状态表达式为 warning，不做静态猜测。
3. 保持裸 `base_attack_cooldown`、私有 stack、动态公式为 warning，不做猜测。
