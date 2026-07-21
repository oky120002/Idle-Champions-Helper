# M1 深度审计发现记录

- 作用：记录 M1（阶段 1 + 2 + 9.1）执行过程中四轮深度审计发现的问题与修复，供后续里程碑参考；大部分已修复。
- 关联：架构与进度见 `evolution-plan.md`；M1 执行步骤见 `milestone-1-core-engine.md`。

## v4 最终审计补充（多维度审计·边缘遗漏·已落入相关阶段）

最终审计（一致性/批判性/想象力/可行性/逻辑性）结论：**plan 整体健全**，3 个边缘遗漏补充如下：

1. **真实伤害（% max health）**：IC 的 `damage_enemies`/`damage_hero_percent` 是按最大生命值百分比的伤害（非绝对数值）。**处理**：玩家侧（`damage_hero_percent`）归阶段 5 survival 的伤害输入；怪物侧（英雄对怪物 `damage_enemies`）归阶段 6 vulnerability 或独立"真实伤害 pool"（按场景评估）。不单独开阶段，在 5/6 实现时吸收。

2. **favor（战役声望）**：影响金币预算（baseline）与 blessing 解锁。**处理**：归阶段 11（全局加成）+ 阶段 2 baseline 的金币预算输入。11.1 blessings 调查时一并确认 favor 数据源（`UserProfileSnapshot.favorByCampaign`）。

3. **BUD 的 attack_interval 数据源**：7.4 BUD 计算用 `attack_interval`，数据来自 `champion-details.attacks.base.cooldown`。**处理**：7.1 解析 speed effect 时一并提取 `attack_interval`（从 `attacks.base.cooldown`），供 7.4 使用。

4. **M2 数据补全的已发现缺口**（M1 审计后落库，M2 执行时处理）：
   - **targeting 覆盖**：`normalizeTargetRelation` 仍有 11 个 `hero_dps_multiplier_mult` effect 的 targets 关系未识别（位置类需扩 `HeroPositionRelation`：`other`/`self_and_behind_and_ahead`/`middle_columns`/`tallest_column`/`top_row_of_each_column`/`bottom_row_of_each_column`；机制类长期 unsupported：`heroes[id]`/`bud_setter`/`snowflake`/`active_campaign`/`slot_if_expr`）。每个 targeting 唯一对应 1 个 effect，整体 <0.1%，按需补。
   - **effect_def / pre_stack_amount**：评估在 planner 的价值边界，能复用共享 effect payload 解析的就下沉公共层，避免 planner 单独维护第二套解释。
   - **孤立基线模块去留**：`simulator/specializationBaseline.ts` + `goldBudgetBaseline.ts`（可负担等级基线）+ `gameNumberAddition.ts`（阈值加法）M2 启动时核实——金币链路若纯乘法则删 `gameNumberAddition`；基线模块按阶段 3 金币预算设计决定去留。

## M1 各轮审计发现并修复的问题

### 第三轮（2026-07-20）

- **buff_upgrade wrapper 噪声（已修复）**：`shouldIgnoreUnsupportedEffectEntry` 原仅对 `sourceBucket === 'upgrade-effect-key'` 忽略 buff_upgrade 家族；真实数据里 upgrade 常用 `effectReference: 'buff_upgrade,...'`（`effectDefinition: null`，sourceBucket='upgrade'），导致 6165 条裸 wrapper 名进入 unsupportedSignals，污染 user-facing warnings 并虚高覆盖率 unsupported 计数。实际 signal 已由 `collectEffectEntries` 派生，wrapper 变体覆盖由 `analyzeBuffUpgradeWrappers` 独立审计。修复：忽略条件不再依赖 sourceBucket。
- **覆盖率 supported 列表与 scorer 脱节（已修复）**：`classifyScoringSupport` 漏列 `per_target_crusader` / `per_col_behind`，但 `placementFit` 实际支持——覆盖率报告误报为 unsupported-composition。修复：补齐列表。
- **数据脚本测试未接入运行器（已修复）**：`scripts/data/*.test.mjs`（6 个文件、24 测试，含 build-models/scenarios 覆盖）用 `node:test` 但 vitest 只含 `tests/unit/**`、CI 也未跑——buff_upgrade 噪声 bug 因此多轮未被抓到。修复：加 `npm run test:data` 并纳入 `test:regression`。
- **M2 待处理（本轮发现，未展开）**：
  - `scoreFormation` 调用 `evaluatePlacementFit` 未显式传 `dimension: 'damage'`；M1 全员 damage 维度无影响，但 M2 引入 gold/crit 维度时必须显式过滤，否则非伤害 pool 会泄漏进 `carryDps`。
  - `resolveSignalMultiplier` 解析 `bonusScaleOfSignal` 时只取 base 的 multiplier，不重新校验 base 的 `positionQualifier` / `targetQualifier`；阶段 8 buff_upgrade 精细化时需评估 base 与外层 targeting 不一致场景。

### 第四轮（2026-07-20）

- **JSON-string effectReference 产生垃圾 unsupported + 丢失 wrapper 信号（已修复）**：真实数据里 `upgrade.effectReference` 常是 JSON 对象串（`'{"effect_string":"buff_upgrade,...","description":"..."}'`），`collectRawEffectEntries` 原直接把它当 effectString，`splitEffectString` 在 JSON 内部逗号处切断，产生 352 条 `{"effect_string":"buff_upgrade` 垃圾 unsupported 条目。**数据源格式特性（非 bug，已对 raw `upgrade_defines.effect` 核实）**：CNE 官方 API 的 effect 字段序列化不稳定，357 条对象串中 19 条 effect_string 行末缺逗号（伪 JSON），`JSON.parse` 失败 → `parseEffectPayload` 返回 null → buff_upgrades wrapper 信号整条丢失（hero 61 Jaheira 丢 38 个 wrapper）。游戏引擎用自己的 effect 解析器不走 JSON.parse，故能正常运行。修复：`collectRawEffectEntries` 改用 `parseEffectPayload` 已提取的 `effectString`；`parseEffectPayload` 用 `"effect_string"` 正则提取，同时覆盖合法与伪 JSON 两种形态。unsupported 从 3715→3394（垃圾清零），recognizedSignals 14221→14297。教训见 AGENTS.md「数据源格式追溯」守则。
- **stackFunc 白名单两份平行维护的 DRY 隐患（已修复）**：第三轮虽同步了 `classifyScoringSupport` 与 `STACK_COUNT_RESOLVERS` 的脱节，但根因（两份独立列表）仍在。修复：`placementFit` 导出 `STACK_COUNT_RESOLVERS`，`signal-coverage` 导出 `SCORING_SUPPORTED_STACK_FUNCS`，新增 `scoringSupportSync.test.ts` 守护两侧 keys 完全一致——任一侧新增 stackFunc 时测试失败强制同步。
- **跨 upgrade amount_expr 解析忽略 upgrade id（已修复）**：`resolveSimpleAmountExpr` 解析 `upgrade_amount(id,index)` 时只用 index 取当前 upgrade 的 `payloads[index]`，完全忽略 id。真实数据有 5 条跨 upgrade 引用（如 hero 141 upgrade 13278 引用 upgrade 13275 的 `hero_dps_multiplier_mult,100`），hero 141 的 heroDpsMultiplier 自增益 value 被错解为 0（+0%）而非 100（+100%）。修复：`collectRawEffectEntries` 构建 `upgradePayloadsById` 映射（upgrade id → effect_keys payloads），`resolveSimpleAmountExpr` 改用 resolver 回调按 id 跨 upgrade 查找，map 缺失时回退旧 `payloads[index]` 保兼容。
- **beamSearch 收口重复评分（已修复）**：`beamSearchRanking` 循环最后一轮已评分并剪枝到 beamWidth，但收口又对同批候选重跑 `scoreFormation`，每次全阵型 O(N²×signals)，浪费 beamWidth 次评分。修复：循环持有 `scored`，收口直接复用。
- **carry-dps-formula-spike 文档措辞漂移（已修复）**：line 14 写 `costCurves[seat]`，但实际官方数据 key 恒为 `"1"`、与 seat 无关（line 32 已澄清）。修正为 `costCurves["1"]`。
- **P0：`normalizeTargetQualifier` 多 tag 目标按逗号 split 导致 521 条 signal 永久失效（已修复）**：IC 数据源 `effect_defines.targets.tags` 用 `|` 分隔多 tag 表示 OR（如 `cleric|wizard|sorcerer|warlock` = 任一职业命中），`normalizeTargetQualifier` 原按逗号 split，整串被当成 1 个不存在的"超级 tag"，`matchesHeroQualifier` 永远匹配失败 → 多职业/多 tag 目标的 buff 全部失效（hero-abilities 里 267 条直接 + 254 条 `bonusScaleOfSignal` 派生 = **521 条 signal 失效**）。`parseTagQualifierFromArg`（另一路径）却正确按 `|` split，两解析器不一致。追溯根因发现 Jaheira 的 `buff_upgrades` → upgrade 9714 → `effect_def,1308` → `hero_dps_multiplier_mult,100` targets `cleric|wizard|sorcerer|warlock` 两层引用链完整存在，但末端 tag 拆分断裂。修复：`normalizeTargetQualifier` 改按 `|` split + lowercase（与 `parseTagQualifierFromArg` 一致）。修复后全库多职业 dps 目标 signal 恢复匹配（如 Jaheira 给牧师/法师/术士/邪术师 +100% dps 重新生效）。
- **`normalizeTargetQualifier` 补 `^` AND + `!` NOT + 复合保守（已修复，推广审计发现）**：推广审计发现 IC tags 是完整布尔表达式（`\|` OR、`^` AND、`!` NOT、`()` 分组），不只 `|`。30 条 tags 用 `^`（如 `lawful^good`=守序且善良、`!evil^!blackdicesociety`=排除这两 tag）之前整串当 1 个 tag 失效。`HeroQualifier` 扁平结构表达不了布尔树（`mergeTagRequirements` 复合返回 null），故分两档：新增 `parseTagsExpression` 支持简单 `\|`/`^`/`!`（覆盖 10 条纯 `^` AND：8 排除 + 2 AND）；复合表达式（括号或 `\|^` 混用，20 条）降级 `UNSUPPORTED_TARGET_QUALIFIER`（永真假 tag）保守不评分。统一布尔 AST 解析器作为后续技术债记入 `TODO.md` atd_19e8bc990e（含完整语法 spec、字段分布、4 解析器现状、技术合一判断（语法同构+求值同域两层标准）、方案）。
- **effect 对象串 effect_string 提取上移到 normalize 层（已修复）**：第三/四轮的 `parseEffectPayload` 正则兜底是消费层适配，但分层职责上应在归一化层处理。新增 `normalize-idle-champions-definitions.mjs` 的 `normalizeEffectReference`：`upgrade_defines.effect` 是 JSON 对象串时，在归一化层提取 `effect_string` 作为 `effectReference`，让 champion-details 直接产出干净的标准 effect 串（`buff_upgrades,100,...`），消费层不再需要处理伪 JSON。消费层 `parseEffectPayload` 的对象串分支降级为防御（其他来源）。基于最新 raw（164 champions）全量重跑 normalize + build-models 验证：champion-details 对象串 effectReference = 0，hero-abilities 含 `|` 坏 tag = 0。
- **M2 待处理（本轮发现，未展开）**：
  - **复合 amount_expr 未解析（20 条）**：真实数据有 `upgrade_amount(N,N)+max_upgrade_amount(N,N)` / `upgrade_amount(N,N)*upgrade_amount(N,N)*N.N` / `upgrade_amount(N,dps_update)` 等复合表达式（共 20 条），`resolveSimpleAmountExpr` 只匹配单一 `upgrade_amount(N,N)`，复合的回退 `getPrimaryAmountToken` 得 effect 自身 value（常为 0）。归 stage 8 effect_def / pre_stack_amount 精细化处理。
  - **buff_upgrades wrapper 多稀有度同存（如 hero 61 Jaheira 168 条）**：同一 buff_upgrades 在不同稀有度/等级下有不同 magnitude（100/200/25/87.5/150/275），当前全部进 signal 列表，scoring 把它们当独立 signal 累加进 pool（游戏实际只取最高稀有度）。归 stage 8 buff_upgrade top-N / 稀有度去重处理。

## 审计维度结论

- **一致性**：阶段 7/15/16 格式已统一为 ### 标题（原列表项）。
- **想象力**：dimension 枚举位 / scoringMode 多模式 / semantic-overrides + 浏览器本地 override 均为未来扩展留位（新英雄/新 effect/用户自定义）。
- **可行性**：每步可执行；数据源未确认的有专门确认步骤（批判①）；BUD/crit 公式有 spike（2.0）+ 实测（7.5）兜底。
- **逻辑性**：依赖顺序合理（顺序评估已论证）；阶段间数据流清晰（每阶段产出 signal/pool/data 给下游）；5.3 survival→10 推图预估的跨阶段依赖已标注。
