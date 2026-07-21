# M1 审计发现的技术要点

- 作用：收纳 M1（阶段 1 + 2 + 9.1）审计中确认的设计补充、M2 待处理项与数据源格式坑；已修复的解析问题体现在代码与测试，此处只留要点供回归参考。
- 关联：架构与进度见 `evolution-plan.md`；M1 执行步骤见 `milestone-1-core-engine.md`；数据源格式追溯守则见 `AGENTS.md` §1.3。

## 边缘遗漏（已落入相关阶段）

1. **真实伤害（% max health）**：IC 的 `damage_enemies` / `damage_hero_percent` 按最大生命值百分比造成伤害（非绝对数值）。玩家侧归阶段 5 survival 伤害输入；怪物侧归阶段 6 vulnerability 或独立“真实伤害 pool”（按场景评估）。
2. **favor（战役声望）**：影响金币预算（baseline）与 blessing 解锁。归阶段 11（全局加成）+ 阶段 2 baseline 金币预算输入；11.1 一并确认 favor 数据源（`UserProfileSnapshot.favorByCampaign`）。
3. **BUD 的 attack_interval 数据源**：7.4 BUD 计算用 `attack_interval`，来自 `champion-details.attacks.base.cooldown`；7.1 解析 speed effect 时一并提取。
4. **targeting 覆盖**：`normalizeTargetRelation` 仍有 11 个 `hero_dps_multiplier_mult` effect 的 targets 关系未识别（位置类需扩 `HeroPositionRelation`：`other` / `self_and_behind_and_ahead` / `middle_columns` / `tallest_column` / `top_row_of_each_column` / `bottom_row_of_each_column`；机制类长期 unsupported：`heroes[id]` / `bud_setter` / `snowflake` / `active_campaign` / `slot_if_expr`）。每个 targeting 唯一对应 1 个 effect，整体 <0.1%，按需补。
5. **effect_def / pre_stack_amount**：评估在 planner 的价值边界，能复用共享 effect payload 解析的就下沉公共层，避免 planner 单独维护第二套解释。
6. **孤立基线模块去留**：`simulator/specializationBaseline.ts` + `goldBudgetBaseline.ts` + `gameNumberAddition.ts` M2 启动时核实——金币链路若纯乘法则删 `gameNumberAddition`；基线模块按阶段 3 金币预算设计决定去留。

## M2 待处理项

- `scoreFormation` 调用 `evaluatePlacementFit` 未显式传 `dimension: 'damage'`；M1 全员 damage 维度无影响，但 M2 引入 gold / crit 维度时必须显式过滤，否则非伤害 pool 会泄漏进 `carryDps`。
- `resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时只取 base 的 multiplier，不重新校验 base 的 `positionQualifier` / `targetQualifier`；阶段 8 buff_upgrade 精细化时需评估 base 与外层 targeting 不一致场景。
- **复合 amount_expr 未解析（20 条）**：`upgrade_amount(N,N)+max_upgrade_amount(N,N)` / `upgrade_amount(N,N)*upgrade_amount(N,N)*N.N` / `upgrade_amount(N,dps_update)` 等复合表达式，`resolveSimpleAmountExpr` 只匹配单一 `upgrade_amount(N,N)`，复合的回退 `getPrimaryAmountToken` 得 effect 自身 value（常为 0）。归阶段 8 effect_def / pre_stack_amount 精细化。
- **buff_upgrades wrapper 多稀有度同存**（如 hero 61 Jaheira 168 条）：同一 buff_upgrades 在不同稀有度 / 等级下有不同 magnitude，当前全部进 signal 列表累加进 pool（游戏实际只取最高稀有度）。归阶段 8 buff_upgrade top-N / 稀有度去重。

## 数据源格式特性（已在归一化层与代码处理）

以下 M1 审计发现的格式坑已修复，要点供回归参考；追源守则见 `AGENTS.md` §1.3。

- `upgrade_defines.effect` 常是 JSON 对象串（含伪 JSON，行末缺逗号）；归一化层 `normalizeEffectReference` 提取 `effect_string`，消费层不再处理伪 JSON。
- `effect_defines.targets.tags` 是布尔表达式（`|` OR、`^` AND、`!` NOT、`()` 分组）；`parseTagsExpression` 覆盖简单 `|` / `^` / `!`，复合表达式降级 `UNSUPPORTED_TARGET_QUALIFIER` 保守不评分；统一布尔 AST 解析器记入根 `TODO.md`。
- `upgrade_amount(id,index)` 可跨 upgrade 引用；`resolveSimpleAmountExpr` 按 id 跨 upgrade 查找，缺失回退 `payloads[index]`。
- buff_upgrade wrapper 信号由 `collectEffectEntries` 派生，覆盖率统计不再依赖 sourceBucket。
- `STACK_COUNT_RESOLVERS` 与 `SCORING_SUPPORTED_STACK_FUNCS` 由 `scoringSupportSync.test.ts` 守护 keys 一致。
