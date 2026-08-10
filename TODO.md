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

- cooldownReduction 归一化管线缺失——1860 条原始效果产出 0 信号 <!-- auto-todo:id=atd_0cb934b094 -->
  - 记录时间: `2026-08-09T21:31:56+08:00`
  - 类型: issue
  - 位置: `scripts/data 归一化管线（speedResolver 或上游 collect 阶段）`
  - 备注: 1860 条 reduce_ultimate_cooldown 原始效果（154 英雄）产出 0 信号。speedResolver.ts 已接线（resolverDispatch.ts:25 映射 reduce_ultimate_cooldown → cooldownReduction），但 hero-abilities.json 中 cooldownReduction 条目为 0。
    - 影响：speed 维度 cooldownReduction 信号完全丢失，speed-scoring-dimension 需求前置依赖
    - 证据：2026-08-09 Python 逐值核验 hero-abilities.json，damage-mechanic-inventory.md M1 记载 ~620 条与实际不符
    - 优先级：中

- computeCarryDps:33 Number.isFinite guard 静默吞掉 NaN/非正 damageAggregate <!-- auto-todo:id=atd_600a5e8368 -->
  - 记录时间: `2026-08-10T09:50:08+08:00`
  - 类型: issue
  - 位置: `src/domain/simulator/baseDps.ts:33`
  - 备注: globalBuffMultiplier=NaN 等上游损坏时加成被静默替换为 1，carryDps 有合法值但无 warning 诊断（集成契约审计发现，锁现状）

- 领域层硬编码中文 UI 文本未国际化（signalMultiplier 警告 + recommendationEngine 违规信息） <!-- auto-todo:id=atd_665afea3d4 -->
  - 记录时间: `2026-08-10T09:54:41+08:00`
  - 类型: issue
  - 位置: `src/domain/planner/mechanics/signalMultiplier.ts:44`
  - 备注: signalMultiplier.ts 警告（乘算堆叠溢出/依赖基础增益未生效）和 recommendationEngine.ts 违规信息（seat 冲突/缺少强制英雄）直接返回中文字符串，经 PlannerResultCard 显示在 UI。需改为返回结构化数据（code + params），由 UI 层翻译。

<!-- auto-todo:end -->
