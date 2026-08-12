<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

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

- cooldownReduction 装备源无 owned-aware 通道（非管线 bug，已查明设计缺口） <!-- auto-todo:id=atd_0cb934b094 -->
  - 记录时间: `2026-08-09T21:31:56+08:00`
  - 类型: follow-up
  - 位置: `src/domain/buffs/equipmentMult.ts（装备五通道缺 speed/cooldown kind）`
  - 备注: 2026-08-09 深度排查根因：624 条 reduce_ultimate_cooldown effect_string（非原记 1860）分两路——12 条专精源正确进 specialization-catalog.json（cooldownReduction 12 条已验证）；612 条装备源被 buildHeroModels loot 过滤丢弃（防双重计数，正确行为），但装备五通道（SIMPLE_VALUE_KINDS）不含 reduce_ultimate_cooldown/reduce_attack_cooldown，无 owned-aware 通道接手。speedResolver 接线正确，pipeline 无 bug。此缺口随 speed 维度需求（2026-08-planner-speed-dimension）一并解决——在装备通道扩展 speed kind 或在 speed 评分实现时统一处理。
    - 影响：装备源 cooldown 缩减信号未建模（speed 维度未消费，当前无评分影响）
    - 证据：npx tsx 实跑 collectEffectEntries + specialization-catalog.json 验证 + Python 逐源分类（loot 612 / upgrade_ek 12 全专精）
    - 优先级：中（随 speed 维度推进时解决）

- architecture.md 195 行超叶子文档阈值 180（governance 测试 FAIL） <!-- auto-todo:id=atd_a6aa4be23c -->
  - 记录时间: `2026-08-10T11:59:22+08:00`
  - 类型: optimization
  - 位置: `docs/specs/modules/planner/architecture.md`
  - 备注: 预已存在，与 HasEffect 任务无关
    - 位置：docs/specs/modules/planner/architecture.md
    - 阈值：叶子文档 <=180 行默认保留，181+ 应拆
    - 治理测试 docs-governance.test.ts 持续报错

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
