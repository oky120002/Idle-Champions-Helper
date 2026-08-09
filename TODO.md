<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- HasEffect/HasEffectByID 布尔谓词未解析：7 个去重表达式(~14 原始实例)，含 2 个评分关键 <!-- auto-todo:id=atd_6f71fd37c3 -->
  - 记录时间: `2026-08-08T13:27:44+08:00`
  - 类型: follow-up
  - 位置: `src/domain/abilities/heroPredicate.ts:138-238`
  - 备注: 2026-08-08 深度复核修正：TODO 原说 4 个，实际 7 个去重表达式（含 HasEffectByID 漏报） - 评分关键实例：Skylla(169) HasEffectByID(2474) 门控 hero_dps_multiplier_mult,400(+400% DPS)；Knox(82) HasEffect(celeste_heal) 门控 damage_reduction,25(25%减伤) - 其余：Cazrin(166) 复合条件含 HasEffectByID(2416)、Alyndra(77) HasEffect、Kas(153) !HasEffect、Trixie(176) do_nothing(无影响) - 37 unparsed 中其余 ~30 个是数值表达式(floor/min/max/属性引用)和不支持的函数(num_applied_pigments/AverageILevels)，非谓词类型

- Modron 管道 buff 数值未进 planner 评分 <!-- auto-todo:id=atd_4ca7841bda -->
  - 记录时间: `2026-08-08T12:56:14+08:00`
  - 类型: optimization
  - 位置: `src/domain/simulator/modronInfo.ts`
  - 备注: modronInfo.ts/ultUptime.ts/blessingGlobalBuff.ts 三处消费 modron 数据，但管道(齿轮)的伤害/金币/速度 buff 数值未建模。- 影响：planner 推荐不反映 modron 管道加成- 证据：modron-automation.md 调研，effect-reference.json 中 16 个 modron_* 谓词均 serverOnly

- 取反复合对齐标记（!lawful_good）不展开 De Morgan——forbidden 位置保持字面量 <!-- auto-todo:id=atd_f24a57fc7f -->
  - 记录时间: `2026-08-08T22:05:12+08:00`
  - 类型: issue
  - 位置: `scripts/data/normalize-adventures.ts:816`
  - 备注: 取反复合对齐标记（如 !lawful_good）不展开 De Morgan（forbidden 位置复合标记保持字面量，因无英雄持有 lawful_good 标记故恒 vacuously true=不排除任何人）。当前全库 0 实例触发，仅理论边界。
    - 影响：!lawful_good 应排除守序善良英雄，当前不排除任何人（forbidden:lawful_good 无英雄匹配）
    - 证据：parseAtom 取反分支直接 slice(1) 不查 COMPOUND_ALIGNMENT_TAGS；修复需 De Morgan 展开（!lawful_good → forbidden:lawful OR forbidden:good 两子句）
    - 优先级：低（0 实例触发）

- 全站正则表达式深度审查：正确性、业务逻辑契合度、扩散面 <!-- auto-todo:id=atd_regex_audit_001 -->
  - 记录时间: `2026-08-09T10:30:00+08:00`
  - 类型: follow-up
  - 位置: `src/**`
  - 备注: 对全站所有正则表达式（RegExp 字面量、new RegExp、字符串匹配/替换/拆分中的 pattern）做一次系统性深度审查。
    - 正确性：ReDoS 风险、贪婪/非贪婪误用、字符类遗漏、锚点缺失、转义错误
    - 业务契合度：正则是否完美服务使用处的业务意图（游戏数据解析、标签表达式解析、i18n 文本匹配、路由参数提取等），有无过宽或过窄匹配
    - 扩散面：每个正则的影响范围是否正确隔离，有无一处定义多处复用但语义不同，有无匹配结果扩散到非预期下游
    - 范围：src/ 全目录 + scripts/data/ 数据管线
    - 验证：逐正则溯源使用处，确认业务语义一致，补测覆盖边界

- restrictions-parser 复合属性门槛「STAT and STAT of N+」只捕获最后一个属性 <!-- auto-todo:id=atd_5010068521 -->
  - 记录时间: `2026-08-09T18:25:56+08:00`
  - 类型: follow-up
  - 位置: `scripts/data/restrictions-parser.ts:213`
  - 备注: 8 个变体受影响（如 STR and CON of 14+），需语义级解析增强，正则 matchAll 只能捕最后一个 STAT

- applyHealthDrain drainRate>=1 时静默跳过（返回满血而非0） <!-- auto-todo:id=atd_d2d4ed72dc -->
  - 记录时间: `2026-08-09T18:26:02+08:00`
  - 类型: follow-up
  - 位置: `src/domain/simulator/areaEstimation.ts:134`
  - 备注: drainRate=1.0 时 guard drainRate<1 不通过，返回满血而非0（应立即致死）；实际数据最高 0.2 不触发，属防御性隐患

- recommendationEngine warnings 未走 i18n（跨层设计问题） <!-- auto-todo:id=atd_b8b9fcd5b6 -->
  - 记录时间: `2026-08-09T18:26:05+08:00`
  - 类型: follow-up
  - 位置: `src/domain/planner/recommendationEngine.ts:776`
  - 备注: engine 产出的 warning 是中文裸字符串，UI 直接渲染不经 t()；en-US locale 下用户看到中文 warning

- PlannerDamageSlots 不展示系统解析的 damageSourcePattern 位置限制（25 变体） <!-- auto-todo:id=atd_633996a2a3 -->
  - 记录时间: `2026-08-09T19:46:48+08:00`
  - 类型: optimization
  - 位置: `src/pages/planner/PlannerDamageSlots.tsx`
  - 备注:
    - 来源：深度审计 2026-08-09 UI 子智能体发现

- EN 递增占格模式检测覆盖不足（variant 116 等） <!-- auto-todo:id=atd_1d344ad97a -->
  - 记录时间: `2026-08-09T19:46:55+08:00`
  - 类型: issue
  - 位置: `scripts/data/restrictions-parser.ts:46`
  - 备注:
    - 来源：深度审计 2026-08-09 数据管线子智能体发现

- schema 未钉 enemyTypes/scenarioRef/objectiveArea/scenarioWarnings 等消费字段 <!-- auto-todo:id=atd_6752294b13 -->
  - 记录时间: `2026-08-09T19:46:59+08:00`
  - 类型: optimization
  - 位置: `src/domain/types/build-product-schemas.ts:63`
  - 备注:
    - 来源：深度审计 2026-08-09 数据管线子智能体发现

- cooldownReduction 装备源无 owned-aware 通道（非管线 bug，已查明设计缺口） <!-- auto-todo:id=atd_0cb934b094 -->
  - 记录时间: `2026-08-09T21:31:56+08:00`
  - 类型: follow-up
  - 位置: `src/domain/buffs/equipmentMult.ts（装备五通道缺 speed/cooldown kind）`
  - 备注: 2026-08-09 深度排查根因：624 条 reduce_ultimate_cooldown effect_string（非原记 1860）分两路——12 条专精源正确进 specialization-catalog.json（cooldownReduction 12 条已验证）；612 条装备源被 buildHeroModels loot 过滤丢弃（防双重计数，正确行为），但装备五通道（SIMPLE_VALUE_KINDS）不含 reduce_ultimate_cooldown/reduce_attack_cooldown，无 owned-aware 通道接手。speedResolver 接线正确，pipeline 无 bug。此缺口随 speed 维度需求（2026-08-planner-speed-dimension）一并解决——在装备通道扩展 speed kind 或在 speed 评分实现时统一处理。
    - 影响：装备源 cooldown 缩减信号未建模（speed 维度未消费，当前无评分影响）
    - 证据：npx tsx 实跑 collectEffectEntries + specialization-catalog.json 验证 + Python 逐源分类（loot 612 / upgrade_ek 12 全专精）
    - 优先级：中（随 speed 维度推进时解决）

<!-- auto-todo:end -->
